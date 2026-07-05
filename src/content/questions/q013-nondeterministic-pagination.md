---
title: Non-Deterministic Pagination
qid: Q013
order: 13
category: sql
language: sql
difficulty: mid
summary: LIMIT/OFFSET without an ORDER BY has no stable order, so pages skip and duplicate rows as data changes.
tags:
  - pagination
  - ordering
draft: false
---

## Prompt

```sql
SELECT id, title, created_at
FROM reviews
WHERE status = 'PENDING'
LIMIT 20 OFFSET 40;
```

## Task

1. Explain what this query is intended to do.
2. Identify why pagination can be unstable.
3. Propose the **smallest safe fix**.
4. Explain when keyset pagination is better than offset pagination.
5. Describe a verification approach.

## Expected answer

The query returns a page of pending reviews, but without `ORDER BY` the database may return rows in any order. Even with an order, offset pagination can skip or duplicate rows when rows are inserted or deleted between requests.

## Issues

- No deterministic order.
- Results may change across executions.
- Offset gets slower as it grows.
- Concurrent inserts/deletes cause missing or duplicated rows across pages.
- Ordering only by `created_at` leaves ties unstable.

## Smallest safe fix

```sql
SELECT id, title, created_at
FROM reviews
WHERE status = 'PENDING'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 40;
```

For high-volume feeds, use keyset pagination:

```sql
SELECT id, title, created_at
FROM reviews
WHERE status = 'PENDING'
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

## Verification approach

- Run the original query twice after inserts and compare page overlap.
- Assert page 1 and page 2 have no duplicate ids under a fixed dataset.
- Check the query plan and a supporting index on `(status, created_at DESC, id DESC)`.

## Strong answer signals

- Says no `ORDER BY` means no stable pagination contract.
- Adds a tie-breaker column.
- Knows when offset is acceptable vs. when keyset is needed.
- Mentions index support.

## Common traps

- Believing primary-key order is implicit.
- Adding `ORDER BY created_at` with no tie-breaker.
- Jumping to keyset without explaining the tradeoffs (e.g. arbitrary page jumps).

## Follow-up probe

> Product wants "go to page 37." Does keyset pagination still fit?

## Level II stretch — SE II

**Prompt**: Implement keyset pagination as a reusable step: given an optional cursor `(created_at, id)`, return the next page and an opaque next-cursor. Handle the first page (no cursor). Show the SQL and the cursor encode/decode.

**Model answer**: The cursor is just the sort key of the last row seen, encoded opaquely so clients can't tamper with it:

```sql
-- First page: no cursor predicate. Subsequent pages: pass the row-comparison.
SELECT id, title, created_at
FROM reviews
WHERE status = 'PENDING'
  AND (:has_cursor = FALSE OR (created_at, id) < (:last_created_at, :last_id))
ORDER BY created_at DESC, id DESC
LIMIT :page_size;
```

```ts
// Opaque cursor = base64 of the last row's sort key.
type Cursor = { createdAt: string; id: string };

const encodeCursor = (row: Cursor) =>
  Buffer.from(JSON.stringify(row)).toString('base64url');

const decodeCursor = (raw: string): Cursor =>
  JSON.parse(Buffer.from(raw, 'base64url').toString());

async function page(cursorRaw?: string, size = 20) {
  const c = cursorRaw ? decodeCursor(cursorRaw) : null;
  const rows = await db.query(sql, {
    has_cursor: !!c,
    last_created_at: c?.createdAt ?? null,
    last_id: c?.id ?? null,
    page_size: size,
  });
  const next = rows.length === size ? encodeCursor(rows[rows.length - 1]) : null;
  return { rows, nextCursor: next };
}
```

The row-value comparison `(created_at, id) < (...)` is the whole trick: it's a single indexable predicate that steps past the exact last row (including its tie-breaker), so concurrent inserts can't shift the window — unlike `OFFSET`, which counts positions that move underneath you. `nextCursor === null` signals the end.

## Level III stretch — SE III

**Prompt**: The UI needs both infinite scroll (keyset) and a "jump to page N" control — which keyset can't do directly — without letting deep offsets melt the database. Design one API that serves both, and say when you fall back to offset and what index supports it.

**Model answer**: Offer a cursor-first API and treat page-number jumps as a bounded, explicitly-degraded mode rather than the default:

```
GET /reviews?status=PENDING&limit=20&cursor=<opaque>     # infinite scroll (keyset)
GET /reviews?status=PENDING&limit=20&page=37             # jump (bounded offset)
```

Rules: cursor requests use keyset (O(1) per page, index-only). Page-number requests translate to `OFFSET (page-1)*limit` but are **capped** — reject or clamp beyond, say, page 500 — because deep `OFFSET` scans and discards every skipped row and will scan-melt the DB at page 50,000. For the common "jump ahead a bit" case, that cap is fine; for genuinely deep navigation, precompute page **boundary cursors** (every Nth row's sort key, refreshed periodically) so "page 37" resolves to a stored cursor and stays O(1). Both paths ride the same covering index `(status, created_at DESC, id DESC)` — keyset uses it as a range seek, offset uses it as an ordered scan. The honest tradeoff to state: exact "page 37 of 4,213" with live data is fundamentally at odds with a stable feed; you either accept approximate page counts + boundary cursors, or accept that deep offset is O(offset) and cap it. Naming that tension — instead of pretending keyset does everything — is the senior signal.
