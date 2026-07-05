---
title: API Client Trusts `as T` and Ignores HTTP Errors
qid: Q011
order: 11
category: react-ts
language: typescript
difficulty: mid
summary: A fetch helper casts the JSON to a generic and never checks response.ok, so error responses are treated as success and the type is a lie.
tags:
  - type-safety
  - fetch
draft: false
---

## Prompt

```tsx
export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json() as Promise<T>;
}
```

## Task

1. Explain what this helper does.
2. Identify the correctness, runtime-safety, and UX bugs.
3. Propose the **smallest safe fix**.
4. Write one test for a non-2xx response.
5. Explain what TypeScript does and does not guarantee here.

## Expected answer

The helper fetches a URL and returns the parsed JSON cast to `T`. It never checks `response.ok`, so `404`, `500`, or `429` responses are parsed as if they were success payloads. The `as Promise<T>` cast does no runtime validation.

## Issues

- Non-2xx responses are treated as success.
- `204 No Content` or invalid JSON can throw unexpectedly.
- No timeout / abort handling.
- No structured error type.
- The cast creates false confidence; runtime shape is unvalidated.
- Callers can't distinguish network error, server error, validation error, and parse error.

## Smallest safe fix

```tsx
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message = `Request failed with status ${status}`,
  ) {
    super(message);
  }
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, body);
  }
  return body as T;
}
```

For stronger correctness, validate at the boundary with a schema (Zod/io-ts).

## Regression test

```tsx
it('throws ApiError on a non-2xx response', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errorCode: 'INTERNAL_ERROR' }),
    }),
  );

  await expect(getJson('/api/reviews/1')).rejects.toMatchObject({
    status: 500,
    body: { errorCode: 'INTERNAL_ERROR' },
  });
});
```

## Strong answer signals

- Says `as T` is not runtime validation.
- Checks HTTP status before returning success.
- Keeps the fix small but leaves room for schema validation.
- Mentions 204, invalid JSON, and typed error handling.

## Common traps

- "Fetch throws on 404." It does not.
- Adding a `try/catch` that swallows the error and returns `null`.
- Treating generics as proof the server data has the right shape.

## Follow-up probe

> Where would you put runtime schema validation: inside this helper, per endpoint, or at the API-client boundary?

## Level II stretch — SE II

**Prompt**: Add real runtime validation so the returned value actually matches `T`. Change the signature to accept a schema, parse the body, and throw a typed error on mismatch (still handling 204 and invalid JSON). Show the code and a test where the server returns the wrong shape.

**Model answer**: Take a Zod schema and let *it* produce the type, so `T` is derived from a runtime check rather than asserted:

```tsx
import { z } from 'zod';

export async function getJson<S extends z.ZodTypeAny>(url: string, schema: S): Promise<z.infer<S>> {
  const response = await fetch(url);
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(response.status, body, `Response failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

```tsx
const ReviewSchema = z.object({ id: z.string(), title: z.string() });

it('throws when the server returns the wrong shape', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ id: 123 /* number, not string */ }),
  }));
  await expect(getJson('/api/reviews/1', ReviewSchema)).rejects.toBeInstanceOf(ApiError);
});
```

Now `z.infer<S>` guarantees the static type and the runtime shape agree — the cast is gone, and a backend that drifts is caught at the boundary instead of blowing up three components deep.

## Level III stretch — SE III

**Prompt**: Design the API-client boundary for a whole app: per-endpoint schemas, one `ApiError` taxonomy, timeouts/abort, and retries with backoff on `5xx`/`429`. Sketch the client factory and one endpoint.

**Model answer**: Centralize policy in one `request` core; endpoints are thin, typed declarations over it:

```tsx
interface RequestOpts { timeoutMs?: number; retries?: number; }

async function request<S extends z.ZodTypeAny>(
  url: string, schema: S, { timeoutMs = 8000, retries = 2 }: RequestOpts = {},
): Promise<z.infer<S>> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const body = res.status === 204 ? null : await res.json().catch(() => null);
      if (res.status >= 500 || res.status === 429) throw new RetryableError(res.status, body);
      if (!res.ok) throw new ApiError(res.status, body);           // 4xx: don't retry
      return schema.parse(body);
    } catch (err) {
      const retryable = err instanceof RetryableError || (err as Error).name === 'AbortError';
      if (!retryable || attempt >= retries) throw ApiError.from(err);
      await sleep(2 ** attempt * 100 + Math.random() * 50);         // exp backoff + jitter
    } finally {
      clearTimeout(timer);
    }
  }
}

// One typed endpoint — the schema is the single source of truth for the shape.
export const getReview = (id: string) => request(`/api/reviews/${id}`, ReviewSchema);
```

Design decisions worth voicing: **4xx never retries** (it's a client error — retrying just amplifies load), while `5xx`/`429` do, with exponential backoff + jitter to avoid a thundering herd; `AbortController` enforces a real timeout so a hung request can't wedge the UI; one `ApiError` taxonomy (`status`, `body`, a `kind` of network/server/validation) lets call sites branch predictably; and schema-per-endpoint keeps validation *at* the boundary so the rest of the app trusts its types. Where validation lives is the crux of the follow-up: at the client boundary, exactly once per response — not sprinkled per component (duplicated, drifts) and not omitted (the original bug).
