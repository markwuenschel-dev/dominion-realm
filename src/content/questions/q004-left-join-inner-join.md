---
title: LEFT JOIN Accidentally Becoming INNER JOIN
qid: Q004
order: 4
category: sql
language: sql
difficulty: mid
summary: A WHERE filter on the right table silently turns a LEFT JOIN into an INNER JOIN, dropping the majority of rows.
tags:
  - joins
  - null-handling
draft: false
---

## Prompt

```sql
SELECT
    r.id            AS review_id,
    r.status,
    e.citation,
    e.source_type
FROM reviews r
LEFT JOIN evidence e
    ON e.review_id = r.id
WHERE e.source_type = 'POLICY';
```

## Task

1. Explain what the author probably **intended** vs. what this query actually returns.
2. Identify exactly why the `LEFT JOIN` is being converted into an `INNER JOIN` at runtime.
3. Propose the **smallest safe fix** (two common patterns — pick the one fitting the use case).
4. Write a check query or assertion that would have caught the behavioral change.
5. Explain when you'd choose `OR e.source_type IS NULL` vs. moving the filter into `ON` vs. a subquery/CTE.

## Expected answer

Intended: return **all** reviews, showing the citation for those with `POLICY` evidence; reviews without any `POLICY` evidence should still appear with a NULL citation.

Actual: only reviews that have at least one `POLICY` evidence row are returned. Reviews with only `CLINICAL` evidence, or none at all, disappear.

## Root cause

The `WHERE` clause is evaluated **after** the `LEFT JOIN`. Any row where `e.source_type = 'POLICY'` is false — including the NULL rows the outer join generated for unmatched reviews — is filtered out. That effectively converts the outer join into an inner join.

## Smallest safe fixes

**Option A — move the filter into the JOIN (preserves all reviews):**

```sql
SELECT r.id, r.status, e.citation, e.source_type
FROM reviews r
LEFT JOIN evidence e
    ON e.review_id = r.id
   AND e.source_type = 'POLICY';
```

**Option B — explicitly allow NULLs** (only if you want reviews that have POLICY evidence *or* no evidence at all):

```sql
WHERE (e.source_type = 'POLICY' OR e.source_type IS NULL)
```

## Verification query

```sql
SELECT COUNT(*) FROM reviews;                 -- e.g. 1247
SELECT COUNT(*) FROM ( /* the original query */ );  -- e.g. 312  <- much smaller!
SELECT COUNT(*) FROM ( /* the Option A query */ );  -- back to ~1247
```

## Strong answer signals

- Articulates the order of operations (JOIN, then WHERE, then SELECT).
- Gives both fixes and when each applies.
- Verifies with a row count before/after (defensive data engineering).
- Mentions that the `ON`-clause version can filter earlier and be more efficient.

## Common traps

- "Just change LEFT to INNER" — misses that the author wanted outer semantics.
- Only suggesting `OR e.source_type IS NULL` without the cleaner `ON`-clause approach.
- Not noticing the query may be silently dropping most production rows.

## Follow-up probe

> Now the stakeholder says: "I only want reviews that have **no** POLICY evidence at all." How would you write that, and would your earlier fix still work?

## Level II stretch — SE II

**Prompt**: Write two related queries: (1) reviews with **no** POLICY evidence at all (an anti-join), and (2) all reviews with a boolean `has_policy_evidence` flag, still returning every review. Explain why each shape is correct.

**Model answer**: The anti-join keeps the outer join but filters on the *generated NULL*:

```sql
-- (1) reviews with NO policy evidence
SELECT r.id, r.status
FROM reviews r
LEFT JOIN evidence e
    ON e.review_id = r.id AND e.source_type = 'POLICY'
WHERE e.review_id IS NULL;          -- only the unmatched (NULL) rows survive
```

The filter must stay in `ON` (so the join only matches POLICY rows) and the `WHERE e.review_id IS NULL` keeps exactly the reviews that matched nothing. Equivalently, `WHERE NOT EXISTS (SELECT 1 FROM evidence e WHERE e.review_id = r.id AND e.source_type = 'POLICY')` is often clearer and lets the planner short-circuit.

```sql
-- (2) all reviews, flagged
SELECT r.id, r.status,
       EXISTS (SELECT 1 FROM evidence e
               WHERE e.review_id = r.id AND e.source_type = 'POLICY') AS has_policy_evidence
FROM reviews r;
```

`EXISTS` avoids row multiplication (a review with five POLICY rows still yields one row) — the trap that a `LEFT JOIN` + `DISTINCT` would paper over.

## Level III stretch — SE III

**Prompt**: This class of bug (LEFT JOIN + WHERE on the right table) keeps slipping into the warehouse. Design an automated guard that fails CI when a transformation silently drops rows, and describe how you'd detect the existing occurrences at scale. Coding welcome.

**Model answer**: Two layers — a *generic* row-count regression guard on critical models, and *targeted* static analysis for the pattern.

A dbt singular test (or a warehouse assertion) that fails if a joined model returns fewer parent rows than the source:

```sql
-- tests/assert_reviews_not_dropped.sql : fails if it returns any rows
SELECT 'reviews dropped by join' AS failure
FROM (SELECT COUNT(*) AS n FROM {{ ref('reviews') }}) src
CROSS JOIN (SELECT COUNT(DISTINCT review_id) AS n FROM {{ ref('review_evidence_enriched') }}) model
WHERE model.n < src.n;
```

For discovery across hundreds of existing queries, run a SQL linter (SQLFluff with a custom rule, or a parser like `sqlglot`) that flags any `WHERE` predicate referencing only columns from the right side of a `LEFT JOIN` — the mechanical signature of this bug. Then rank by blast radius: fact tables feeding executive dashboards first. The organizational fix that makes it *stay* fixed: a SQL style-guide rule ("filters on the right table of a LEFT JOIN belong in the ON clause unless you intend an inner join — document that intent in a comment"), enforced by the linter in CI, plus a semantic/metric layer so analysts reuse a correct joined model instead of re-writing raw LEFT JOINs. And when you fix it, communicate the row-count change (before/after) to every downstream consumer — some reports and even ML features may have been built on the buggy, filtered numbers.
