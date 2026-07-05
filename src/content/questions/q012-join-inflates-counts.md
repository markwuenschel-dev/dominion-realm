---
title: Join Inflates Counts
qid: Q012
order: 12
category: sql
language: sql
difficulty: mid
summary: COUNT(*) over a review-to-evidence join counts evidence rows, not reviews, silently inflating the metric.
tags:
  - aggregation
  - joins
draft: false
---

## Prompt

```sql
SELECT
    r.status,
    COUNT(*) AS review_count
FROM reviews r
JOIN evidence e
    ON e.review_id = r.id
GROUP BY r.status;
```

## Task

1. Explain what the query probably intends to count.
2. Identify why the count can be inflated.
3. Propose the **smallest safe fix**.
4. Write one verification query.
5. Explain when `COUNT(DISTINCT r.id)` is acceptable vs. when to pre-aggregate.

## Expected answer

The author probably wants the number of reviews per status that have evidence. But the join produces one row per review-evidence pair, so a review with five evidence rows contributes five to the count.

## Issues

- Counts evidence rows, not reviews.
- Inflates metrics silently.
- Can distort dashboards, eval reports, and operational decisions.
- `COUNT(DISTINCT)` can be expensive at scale.
- If the question is "reviews with at least one evidence row," a semi-join is clearer.

## Smallest safe fixes

```sql
SELECT r.status, COUNT(DISTINCT r.id) AS review_count
FROM reviews r
JOIN evidence e ON e.review_id = r.id
GROUP BY r.status;
```

Or with `EXISTS` (a semi-join):

```sql
SELECT r.status, COUNT(*) AS review_count
FROM reviews r
WHERE EXISTS (SELECT 1 FROM evidence e WHERE e.review_id = r.id)
GROUP BY r.status;
```

## Verification query

```sql
SELECT r.id, COUNT(*) AS joined_rows
FROM reviews r
JOIN evidence e ON e.review_id = r.id
GROUP BY r.id
HAVING COUNT(*) > 1
LIMIT 20;
```

## Strong answer signals

- Immediately asks "what entity are we counting?"
- Distinguishes counting joined rows from counting parent entities.
- Offers `EXISTS` as a semantically clean option.
- Mentions the performance tradeoff of `COUNT(DISTINCT)`.

## Common traps

- Assuming `GROUP BY r.status` deduplicates reviews.
- Adding more columns to `GROUP BY`, which often makes it worse.
- Ignoring the business definition of the metric.

## Follow-up probe

> If the dashboard also needs the average evidence count per review by status, how would you write that without double-counting?

## Level II stretch — SE II

**Prompt**: In one query, per status, return: (a) reviews with at least one evidence row, (b) the average evidence rows per review, and (c) reviews with zero evidence. Avoid double-counting. Explain the shape.

**Model answer**: Pre-aggregate evidence to one row per review first (a CTE), then join and aggregate once — so no metric is inflated by the fan-out:

```sql
WITH per_review AS (
    SELECT r.id, r.status,
           COUNT(e.review_id) AS evidence_rows      -- 0 for reviews with none
    FROM reviews r
    LEFT JOIN evidence e ON e.review_id = r.id       -- LEFT so zero-evidence reviews survive
    GROUP BY r.id, r.status
)
SELECT
    status,
    COUNT(*) FILTER (WHERE evidence_rows > 0)  AS reviews_with_evidence,
    COUNT(*) FILTER (WHERE evidence_rows = 0)  AS reviews_without_evidence,
    AVG(evidence_rows)                         AS avg_evidence_per_review
FROM per_review
GROUP BY status;
```

The key move: collapse evidence to one row per review in `per_review`, so the outer aggregation counts *reviews*. `COUNT(e.review_id)` (not `COUNT(*)`) yields 0 for the LEFT-joined NULLs, and `FILTER` cleanly splits the with/without buckets. Computing the average against the raw joined rows would double-count reviews with many evidence rows — the exact trap from the core question.

## Level III stretch — SE III

**Prompt**: This count powers a high-traffic dashboard. Make it correct **and** cheap at scale: pre-aggregate into a rollup keyed by status (and date), and add a data test that the rollup matches source truth. Sketch the model and the test.

**Model answer**: Materialize a per-review grain incrementally, then a small rollup the dashboard reads directly — so the expensive join/aggregate runs on ingest, not per page load:

```sql
-- dbt incremental model: one row per review per day, cheap to refresh.
-- models/marts/review_evidence_daily.sql
SELECT r.id AS review_id, r.status, DATE(r.created_at) AS day,
       COUNT(e.review_id) AS evidence_rows
FROM {{ ref('reviews') }} r
LEFT JOIN {{ ref('evidence') }} e ON e.review_id = r.id
{% if is_incremental() %} WHERE r.updated_at > (SELECT MAX(day) FROM {{ this }}) {% endif %}
GROUP BY 1, 2, 3
```

```sql
-- rollup the dashboard queries (tiny, indexed by status/day)
SELECT status, day,
       COUNT(*) FILTER (WHERE evidence_rows > 0) AS reviews_with_evidence,
       AVG(evidence_rows)                         AS avg_evidence_per_review
FROM {{ ref('review_evidence_daily') }}
GROUP BY status, day
```

The regression guard is a reconciliation test that fails CI if the rollup drifts from source truth:

```sql
-- tests/assert_rollup_matches_source.sql : returns rows (fails) on mismatch
SELECT s.status
FROM (SELECT status, COUNT(DISTINCT review_id) n FROM {{ ref('review_evidence_daily') }} GROUP BY status) roll
JOIN (SELECT status, COUNT(*) n FROM {{ ref('reviews') }} GROUP BY status) s USING (status)
WHERE roll.n <> s.n;
```

Senior framing: correctness and cost aren't a trade here — pre-aggregating to the right grain *both* removes the fan-out inflation and makes the dashboard fast, while the reconciliation test turns "did the join silently drop or double-count?" into a red CI check instead of a discovered-in-prod surprise. Clustering/partitioning the rollup on `status, day` and caching at the BI layer with a sane TTL finishes the job.
