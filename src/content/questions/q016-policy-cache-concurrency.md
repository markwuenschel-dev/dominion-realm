---
title: Unsafe In-Memory Cache in a Singleton Service
qid: Q016
order: 16
category: concurrency
language: java
difficulty: senior
summary: A Spring singleton lazily caches into a plain HashMap with a check-then-put — unsafe under concurrency, unbounded, and never invalidated.
tags:
  - concurrency
  - caching
draft: false
---

## Prompt

```java
@Service
public class PolicyCache {
    private final Map<String, Policy> cache = new HashMap<>();
    private final PolicyClient policyClient;

    public Policy getPolicy(String policyId) {
        if (!cache.containsKey(policyId)) {
            Policy policy = policyClient.fetchPolicy(policyId);
            cache.put(policyId, policy);
        }
        return cache.get(policyId);
    }
}
```

## Task

1. Explain what this service is trying to do.
2. Identify the concurrency and production risks.
3. Propose the **smallest safe fix**.
4. Describe one test or stress-test strategy.
5. Explain when you'd use `ConcurrentHashMap`, Caffeine, Redis, or no cache.

## Expected answer

The service lazily caches policies by id. In Spring, services are singletons by default, so this map is shared across all requests and threads. `HashMap` is not thread-safe, and the check-then-put sequence is not atomic.

## Issues

- Race conditions under concurrent access.
- Multiple threads may fetch the same policy.
- `HashMap` can behave unpredictably (even corrupt/loop) under concurrent mutation.
- No TTL/eviction; memory grows forever.
- No invalidation when policies change.
- No error strategy for failed fetches.
- In multi-instance deployments, each instance has a different local cache.

## Smallest safe fix

```java
@Service
public class PolicyCache {
    private final ConcurrentMap<String, Policy> cache = new ConcurrentHashMap<>();
    private final PolicyClient policyClient;

    public Policy getPolicy(String policyId) {
        return cache.computeIfAbsent(policyId, policyClient::fetchPolicy);
    }
}
```

Better production option: Caffeine with TTL, max size, metrics, and refresh.

## Stress-test strategy

```java
@Test
void getPolicy_concurrentSameKey_fetchesAtMostOnce() {
    runConcurrently(20, () -> policyCache.getPolicy("P-123"));
    verify(policyClient, atMostOnce()).fetchPolicy("P-123");
}
```

In practice, control timing with a latch and a deliberately slow `PolicyClient` so the race window is real.

## Strong answer signals

- Mentions the Spring singleton / shared mutable state.
- Distinguishes thread-safety from cache correctness.
- Discusses TTL, invalidation, memory growth, and multi-instance consistency.
- Recommends Caffeine/Redis based on access pattern, not habit.

## Common traps

- "Use `Collections.synchronizedMap`" without fixing the check-then-act atomicity.
- Ignoring invalidation.
- Assuming a local cache behaves the same across multiple instances.

## Follow-up probe

> If a policy update must be visible within 30 seconds across all app instances, is local caching still acceptable?

## Level II stretch — SE II

**Prompt**: `computeIfAbsent` is thread-safe but still unbounded and never expires, and under load many threads can pile onto the same missing key (cache stampede). Replace it with Caffeine: TTL, max size, per-key single-flight loading, and metrics. Show the config.

**Model answer**: A `LoadingCache` gives atomic per-key loading (so exactly one thread fetches a missing key while others wait) plus bounds and expiry for free:

```java
@Service
public class PolicyCache {
    private final LoadingCache<String, Policy> cache;

    public PolicyCache(PolicyClient client, MeterRegistry metrics) {
        this.cache = Caffeine.newBuilder()
            .maximumSize(10_000)                         // bounded — no unbounded growth
            .expireAfterWrite(Duration.ofMinutes(5))     // TTL — bounded staleness
            .refreshAfterWrite(Duration.ofMinutes(1))    // async refresh, serve stale meanwhile
            .recordStats()                               // hit rate / load time metrics
            .build(client::fetchPolicy);                 // single-flight loader per key
        CaffeineCacheMetrics.monitor(metrics, cache, "policy");
    }

    public Policy getPolicy(String policyId) {
        return cache.get(policyId);                      // loads once per key under contention
    }
}
```

Why each knob: `maximumSize` caps memory (size- or weight-based eviction); `expireAfterWrite` bounds how stale a policy can be; `refreshAfterWrite` avoids a latency cliff by refreshing in the background while serving the old value; and the `LoadingCache` loader collapses a stampede — 20 concurrent misses on `P-123` trigger **one** `fetchPolicy`, the rest block on it. `recordStats()` + `CaffeineCacheMetrics` make the hit rate and load latency observable so you can tune the size/TTL from data, not guesses.

## Level III stretch — SE III

**Prompt**: A policy change must be visible within a 30-second SLA across **all** app instances. A per-instance Caffeine cache with a 5-minute TTL can't meet that. Design a solution and state the consistency/latency tradeoff. Sketch it.

**Model answer**: Per-instance caches drift independently, so a local TTL can't bound cross-instance staleness below the TTL. Two viable shapes, often combined:

**(a) Shorten the local TTL to under the SLA.** Set `expireAfterWrite(20s)`. Dead simple, no new infrastructure, but it trades freshness for load — every instance re-fetches every key every 20s, multiplying origin traffic by instances × keys / 20s. Fine for a small hot set; bad for a large one.

**(b) Active invalidation via a pub/sub bus.** Keep the fast local cache, but when a policy changes, publish an invalidation so every instance evicts that key:

```java
// On write: bump the source of truth, then fan out an eviction.
void updatePolicy(Policy p) {
    policyRepository.save(p);
    invalidationBus.publish(new PolicyChanged(p.id()));   // Redis pub/sub, Kafka topic, etc.
}

// Every instance subscribes and evicts locally — converges in ~network-latency.
@EventListener
void onPolicyChanged(PolicyChanged evt) {
    cache.invalidate(evt.policyId());     // next read re-loads fresh
}
```

Optionally back it with a shared **Redis** read-through layer so a local miss hits a warm distributed cache instead of the origin. The tradeoff to name explicitly: option (a) buys freshness with steady origin load and is eventually consistent up to the TTL; option (b) is near-real-time (bounded by pub/sub delivery, comfortably under 30s) and cheap in steady state, but adds a moving part and a failure mode — a dropped invalidation means a stale instance, so you keep a **short backstop TTL** (say 60s) under the bus so any missed message self-heals. The senior framing: choose based on the SLA and the read/write ratio — a small, hot, rarely-changing policy set → short TTL is enough; a large set with a tight freshness SLA → local cache + invalidation bus + backstop TTL. And "no cache" is a legitimate answer if `fetchPolicy` is already fast and the origin can take the load — a cache you can't keep correct is worse than none.
