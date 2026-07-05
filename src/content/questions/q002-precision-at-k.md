---
title: Precision@k Metric Implementation Bug
qid: Q002
order: 2
category: python-ml
language: python
difficulty: mid
summary: An IR metric counts hits across the whole result list (not the top k) and always divides by k — inflating scores and risking divide-by-zero.
tags:
  - eval-metrics
  - edge-cases
draft: false
---

## Prompt

```python
def precision_at_k(results: list[SearchResult], relevant_ids: set[str], k: int) -> float:
    """Compute precision@k for a ranked list of search results."""
    hits = 0
    for result in results:
        if result.id in relevant_ids:
            hits += 1
    return hits / k
```

## Task

1. Explain what the function is **intended** to compute vs. what it actually computes on typical RAG / search evaluation inputs.
2. Identify every correctness, robustness, and numerical-stability issue.
3. Propose the **smallest safe fix**.
4. Add **one regression test** (pytest) that would have caught the most dangerous bug.
5. Explain the tradeoff and how you'd extend it for `recall@k` and `ndcg@k`.

## Expected answer

Intended: the standard IR metric — the fraction of relevant items among the **top k** retrieved results.

Actual: it counts **all** hits across the entire `results` list (even beyond position k) and always divides by the requested `k`, regardless of how many results were actually returned.

## Bugs

- Doesn't limit iteration to `results[:k]` — inflates precision when `len(results)` exceeds `k` and relevant items sit deeper in the list.
- Divides by `k` even when `len(results)` is less than `k`, or when `k == 0` — can produce values above `1.0` or a `ZeroDivisionError`.
- No guard on `k` (negative or zero silently misbehaves).
- Assumes every `SearchResult` has an `.id` and that `relevant_ids` is a set.
- No handling for duplicate result ids.

## Smallest safe fix

```python
def precision_at_k(results: list[SearchResult], relevant_ids: set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    top_k = results[:k]
    hits = sum(1 for r in top_k if r.id in relevant_ids)
    return hits / k
```

## Regression test

```python
def test_precision_at_k_limits_to_top_k_and_handles_short_lists():
    results = [SearchResult(id=str(i)) for i in range(10)]
    relevant = {"0", "5", "9"}          # 9 is at position 9, beyond k=5

    assert precision_at_k(results, relevant, k=5) == 2 / 5   # only 0 and 5 count
    assert precision_at_k(results[:3], relevant, k=5) == 1 / 5
    assert precision_at_k([], relevant, k=5) == 0.0
    assert precision_at_k(results, relevant, k=0) == 0.0
```

## Strong answer signals

- Immediately spots that the function doesn't respect the "@k" contract.
- Mentions both the inflation bug **and** the division/edge-case problems.
- Writes a test that explicitly checks "only top k are considered."
- Talks about guard clauses without over-engineering.
- Connects the bug to real RAG evaluation pipelines.

## Common traps

- "It looks mostly correct, just add `[:k]`." (Misses the division and `k <= 0` issues.)
- Focusing only on performance ("use a set") instead of correctness.
- Reaching for a full IR library instead of the minimal delta.

## Follow-up probe

> Now implement `recall_at_k` and `ndcg_at_k` using the same style. What additional edge cases appear for NDCG that were hidden in precision?

## Level II stretch — SE II

**Prompt**: Implement `recall_at_k` and `ndcg_at_k` in the same style, handling the empty-relevant-set case and `k` larger than the result list. Add a test that pins the NDCG edge case that precision hid.

**Model answer**: Recall divides by the number of relevant items (guard the empty set); NDCG needs a rank discount and normalization by the *ideal* ordering:

```python
import math

def recall_at_k(results, relevant_ids, k):
    if not relevant_ids:
        return 0.0                      # undefined; 0.0 is the safe convention
    hits = sum(1 for r in results[:k] if r.id in relevant_ids)
    return hits / len(relevant_ids)

def ndcg_at_k(results, relevant_ids, k):
    if k <= 0 or not relevant_ids:
        return 0.0
    dcg = sum(1 / math.log2(i + 2)      # +2 because i is 0-indexed
              for i, r in enumerate(results[:k]) if r.id in relevant_ids)
    ideal_hits = min(len(relevant_ids), k)
    idcg = sum(1 / math.log2(i + 2) for i in range(ideal_hits))
    return dcg / idcg                   # idcg > 0 because ideal_hits >= 1 here
```

The NDCG edge case precision hid: **`idcg` can be zero** if you forget that fewer than `k` relevant items exist — normalizing by a raw `sum(1/log2(...))` over `range(k)` overcounts the ideal and *deflates* NDCG. Pinning it:

```python
def test_ndcg_normalizes_by_achievable_ideal_not_k():
    results = [SearchResult(id="a"), SearchResult(id="x")]   # only "a" relevant, at rank 0
    # Perfect ranking of the one relevant doc => NDCG must be exactly 1.0,
    # NOT 1 / (sum of 1/log2 over k positions).
    assert ndcg_at_k(results, {"a"}, k=5) == 1.0
```

## Level III stretch — SE III

**Prompt**: The team wants graded relevance (an id → gain map, not a binary set) without silently changing what existing binary experiments optimize. Extend the metric to graded relevance **and** version it so historical comparisons stay valid. Sketch the code and the migration guard.

**Model answer**: Change the contract to accept graded gains, keep the binary path as a thin wrapper, and **version the metric name** so no experiment's meaning changes underneath it:

```python
def precision_at_k_graded(results, gains: dict[str, float], k: int) -> float:
    if k <= 0:
        return 0.0
    top_k = results[:k]
    # Normalize by the best achievable gain in k slots so the metric stays in [0, 1].
    got = sum(gains.get(r.id, 0.0) for r in top_k)
    best = sum(sorted(gains.values(), reverse=True)[:k])
    return got / best if best > 0 else 0.0

# Binary stays available and unchanged — old experiments keep their exact meaning.
def precision_at_k_binary(results, relevant_ids: set[str], k: int) -> float:
    return precision_at_k_graded(results, {i: 1.0 for i in relevant_ids}, k)
```

The senior move is *not* the math — it's the change management. Register the graded variant as a **new metric id** (`precision_at_k_graded_v1`) rather than mutating `precision_at_k`, so no running A/B test or offline dashboard has its optimization target quietly redefined. Back it with a property-based test (`hypothesis`) asserting invariants that must hold for any input — the score stays in `[0, 1]`, adding an irrelevant doc never raises it, and a perfect prefix scores `1.0` — plus an offline harness that re-scores recent model comparisons under both versions and reports the delta before anything is promoted. Otherwise a buggy or newly-changed metric creates a feedback loop: a model that merely exploits the metric change looks "better," gets shipped, and shifts what the retriever returns for the *next* evaluation.
