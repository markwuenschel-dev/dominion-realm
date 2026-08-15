import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Sanity revalidation webhook (ADR-0011, Phase 3). The signature check and
 * the tag bust are the whole contract, so both are asserted here with `parseBody`
 * and `revalidateTag` mocked — no real crypto or cache needed. Missing/empty
 * SANITY_REVALIDATE_SECRET is fail-closed before parseBody (CAND-54).
 */
// Hoisted so the mock factories (also hoisted) can reference them safely.
const { revalidateTag, parseBody } = vi.hoisted(() => ({
  revalidateTag: vi.fn<(tag: string, profile?: unknown) => void>(),
  parseBody: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('next-sanity/webhook', () => ({ parseBody }));

import { POST } from './route';

beforeEach(() => {
  revalidateTag.mockReset();
  parseBody.mockReset();
  vi.stubEnv('SANITY_REVALIDATE_SECRET', 'test-webhook-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/revalidate', () => {
  it('rejects an invalid signature with 401 and revalidates nothing', async () => {
    parseBody.mockResolvedValue({ isValidSignature: false, body: null });
    const res = await POST({} as never);
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('busts the sanity tag on a valid signature', async () => {
    parseBody.mockResolvedValue({ isValidSignature: true, body: { _type: 'subject' } });
    const res = await POST({} as never);
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('sanity', { expire: 0 });
    await expect(res.json()).resolves.toMatchObject({ revalidated: true, tag: 'sanity' });
  });

  it('returns 500 when verification throws', async () => {
    parseBody.mockRejectedValue(new Error('bad secret'));
    const res = await POST({} as never);
    expect(res.status).toBe(500);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ['unset', () => { delete process.env.SANITY_REVALIDATE_SECRET; }],
    ['empty', () => { vi.stubEnv('SANITY_REVALIDATE_SECRET', ''); }],
    ['whitespace', () => { vi.stubEnv('SANITY_REVALIDATE_SECRET', '   '); }],
  ])('rejects when SANITY_REVALIDATE_SECRET is %s and revalidates nothing', async (_label, unset) => {
    unset();
    // Even a mocked "valid" parse must not run — unset secret is not open-relay.
    parseBody.mockResolvedValue({ isValidSignature: true, body: { _type: 'subject' } });
    const res = await POST({} as never);
    expect(res.status).toBe(401);
    expect(parseBody).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
