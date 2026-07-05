---
title: Check-Then-Insert Race Condition / Idempotency Bug
qid: Q006
order: 6
category: backend
language: java
difficulty: senior
summary: existsByIdempotencyKey then save is a check-then-act race — two concurrent requests both pass the check and both insert.
tags:
  - concurrency
  - idempotency
draft: false
---

## Prompt

```java
@Transactional
public Order createOrder(CreateOrderRequest request) {
    if (orderRepository.existsByIdempotencyKey(request.idempotencyKey())) {
        throw new DuplicateOrderException(request.idempotencyKey());
    }

    Order order = new Order(
        request.customerId(),
        request.idempotencyKey(),
        request.items()
    );

    return orderRepository.save(order);
}
```

## Task

1. Explain what this code is trying to prevent.
2. Identify the race condition and its failure mode under concurrent requests.
3. Propose the **smallest safe fix**.
4. Write one test or verification approach that would catch it.
5. Explain the tradeoff between duplicate *rejection* and true idempotent *replay*.

## Expected answer

The method tries to prevent duplicate orders by checking whether an idempotency key exists before inserting. But `existsByIdempotencyKey` and `save` are separate operations: two concurrent transactions can both observe "does not exist" and both insert.

## Issues

- Classic check-then-act race.
- `@Transactional` alone doesn't make the predicate globally safe at common isolation levels.
- Without a database unique constraint, correctness depends on timing.
- A duplicate insert can cause downstream systems to reserve inventory, charge payment, or publish duplicate events.
- Throwing `DuplicateOrderException` isn't true idempotency; a client replaying the same key may expect the original successful response.

## Smallest safe fix

Add a unique constraint and handle the violation explicitly.

```sql
ALTER TABLE orders ADD CONSTRAINT uk_orders_idempotency_key UNIQUE (idempotency_key);
```

```java
@Transactional
public Order createOrder(CreateOrderRequest request) {
    try {
        Order order = new Order(request.customerId(), request.idempotencyKey(), request.items());
        return orderRepository.saveAndFlush(order);
    } catch (DataIntegrityViolationException ex) {
        throw new DuplicateOrderException(request.idempotencyKey(), ex);
    }
}
```

## Regression / verification

```java
@Test
void createOrder_concurrentSameIdempotencyKey_createsOnlyOneOrder() throws Exception {
    String key = "abc-123";
    runConcurrently(
        () -> orderService.createOrder(requestWithKey(key)),
        () -> orderService.createOrder(requestWithKey(key))
    );
    assertThat(orderRepository.countByIdempotencyKey(key)).isEqualTo(1);
}
```

## Strong answer signals

- Says the database must enforce the invariant.
- Doesn't rely on Java synchronization for a multi-instance service.
- Distinguishes duplicate rejection from idempotent response replay.
- Mentions downstream side effects and the exactly-once illusion.

## Common traps

- "Wrap it in `synchronized`" — fails across multiple app instances.
- "The transaction already prevents this" — usually false at common isolation levels.
- Only writing a unit test with sequential calls.

## Follow-up probe

> If payment is charged after the order row is created, where should the idempotency boundary live — order service, payment service, or both?

## Level II stretch — SE II

**Prompt**: Product wants **true idempotent replay**: a retry with the same key returns the *original* order's response instead of an error. Handle the race where the first insert hasn't committed yet. Show the code.

**Model answer**: On a unique-constraint violation, read back the existing row and return it — but the winner may still be mid-commit, so read after the conflict surfaces (and be ready to retry the read):

```java
@Transactional
public Order createOrder(CreateOrderRequest request) {
    String key = request.idempotencyKey();
    try {
        return orderRepository.saveAndFlush(
            new Order(request.customerId(), key, request.items()));
    } catch (DataIntegrityViolationException conflict) {
        // Someone else won the race. Return their order (idempotent replay).
        return orderRepository.findByIdempotencyKey(key)
            .orElseThrow(() -> conflict);   // extremely rare: not yet visible -> let caller retry
    }
}
```

The subtlety: at `READ_COMMITTED`, the conflicting row may not be visible to *this* transaction until the other commits, so the `findByIdempotencyKey` can briefly return empty. Handling it as a short bounded retry (or returning a `409` the client retries) is honest; pretending the read always succeeds is the trap. Also note `save` + return isn't enough — you must persist enough of the *original response* (or make the order fully reconstruct it) so the replay is byte-for-byte what the first call returned.

## Level III stretch — SE III

**Prompt**: Design idempotency across a distributed flow — order creation, then a payment charge, then fulfillment — so a client retry never double-charges. Where does the key live, what does the store look like, and how do side effects stay exactly-once-ish? Sketch it.

**Model answer**: Promote the idempotency key to a first-class **request record** that spans the whole flow, not just the order insert. A dedicated table records, per key, the request fingerprint and the *stored response*:

```sql
CREATE TABLE idempotency_keys (
    key             TEXT PRIMARY KEY,
    request_hash    TEXT NOT NULL,        -- detect key reuse with a different body
    status          TEXT NOT NULL,        -- IN_PROGRESS | COMPLETED
    response_body   JSONB,                -- replayed verbatim on retry
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Flow: the first request `INSERT ... ON CONFLICT DO NOTHING` claims the key as `IN_PROGRESS` (the unique PK makes the claim atomic); if the claim fails, another request owns it — wait/replay its `response_body` when `COMPLETED`, or return `409` while `IN_PROGRESS`. The **payment** step is the dangerous one: the charge must carry its *own* idempotency key (most PSPs, e.g. Stripe, accept one) derived deterministically from the order key, so a retry of the charge hits the provider's dedupe rather than billing twice. Order creation and the outbox event that triggers fulfillment commit in the **same DB transaction** (transactional outbox, see Q007); payment lives behind the provider's idempotency guarantee. The boundary answer: the *client-facing* idempotency key lives at the order/API edge and is threaded down as deterministic per-step keys — each side effect is made idempotent at its own boundary, because there is no single transaction spanning the order DB and the external payment system.
