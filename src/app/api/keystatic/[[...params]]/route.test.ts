import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Keystatic OAuth origin resolution (audit CAND-23). The security contract is:
 * the public origin for the GitHub `redirect_uri` comes from deploy-time env
 * (`KEYSTATIC_URL` → `SITE_URL`) and NEVER from a request header, so a spoofed
 * `x-forwarded-host` cannot steer the auth path. `makeRouteHandler` is mocked so
 * importing the route needs no GitHub credentials.
 *
 * The mock returns ONE stable handler object rather than a fresh one per call: the
 * INT-07 suite below asserts that this exact instance is never invoked, and a
 * factory handing back a new object each time would make that assertion vacuously
 * true.
 */
const { innerHandler, makeRouteHandlerSpy } = vi.hoisted(() => {
  const handler = { GET: vi.fn<() => void>(), POST: vi.fn<() => void>() };
  return {
    innerHandler: handler,
    makeRouteHandlerSpy: vi.fn<() => typeof handler>(() => handler),
  };
});

vi.mock('@keystatic/next/route-handler', () => ({
  makeRouteHandler: makeRouteHandlerSpy,
}));

import { GET, POST, withPublicOrigin } from './route';
import { SITE_URL } from '@/lib/site';

afterEach(() => {
  vi.unstubAllEnvs();
});

const internalReq = (headers: Record<string, string> = {}) =>
  new Request('http://127.0.0.1:8080/api/keystatic/github/oauth/callback', { headers });

describe('withPublicOrigin (CAND-23)', () => {
  it('is a no-op when GitHub storage mode is off (local dev)', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'false');
    const req = internalReq();
    expect(withPublicOrigin(req)).toBe(req);
  });

  it('pins an internal-bind origin to the canonical SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'true');
    vi.stubEnv('KEYSTATIC_URL', '');
    const out = new URL(withPublicOrigin(internalReq()).url);
    expect(out.host).toBe(new URL(SITE_URL).host);
    expect(out.protocol).toBe('https:');
  });

  it('prefers an explicit KEYSTATIC_URL override', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'true');
    vi.stubEnv('KEYSTATIC_URL', 'https://cms.example.com');
    const out = new URL(withPublicOrigin(internalReq()).url);
    expect(out.host).toBe('cms.example.com');
  });

  it('IGNORES a spoofed x-forwarded-host — origin stays on SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'true');
    vi.stubEnv('KEYSTATIC_URL', '');
    const rewritten = withPublicOrigin(internalReq({ 'x-forwarded-host': 'evil.com' }));
    const out = new URL(rewritten.url);
    expect(out.host).toBe(new URL(SITE_URL).host);
    expect(rewritten.url).not.toContain('evil.com');
    // The outbound header is overwritten to the pinned base, not passed through.
    expect(rewritten.headers.get('x-forwarded-host')).toBe(new URL(SITE_URL).host);
  });

  it('leaves an already-public request untouched', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'true');
    vi.stubEnv('KEYSTATIC_URL', '');
    const req = new Request(`${SITE_URL}/api/keystatic/github/oauth/callback`);
    expect(withPublicOrigin(req)).toBe(req);
  });
});

/**
 * INT-07 — the handler boundary itself. `keystaticAccess.test.ts` proves the gate's
 * logic; this proves the route consults it BEFORE Keystatic runs, for every verb and
 * every path including `tree`.
 *
 * The unit under test is the real exported handler, so a future refactor that moves
 * the check after `keystatic.GET(...)` — or drops it from one verb — fails here.
 */
describe('INT-07: the route is sealed when authoring is disabled', () => {
  const tree = () => new Request(`${SITE_URL}/api/keystatic/tree`, { headers: { 'no-cors': '1' } });

  /**
   * The regression that reached production. `makeRouteHandler` validates eagerly and
   * THROWS in github mode without OAuth secrets. Called at module scope, that throw
   * happens during module evaluation, the route module never loads, and every request
   * 500s from an import error -- so the gate below never runs at all. Observed live on
   * 2026-08-24. Construction must therefore be lazy, and must never happen for a
   * request the gate refuses.
   *
   * This assertion runs before anything in this file issues a request, so a non-zero
   * count here means construction happened at import time.
   */
  it('never constructs the Keystatic handler at module load', () => {
    expect(makeRouteHandlerSpy).not.toHaveBeenCalled();
  });

  it('does not construct the handler for a request it refuses', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await GET(tree());
    await POST(tree());
    // A shut gate must not touch Keystatic's config validation, so no combination of
    // missing or malformed secrets can influence the response.
    expect(makeRouteHandlerSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', GET],
    ['POST', POST],
  ])('%s returns 404 in production with no authoring opt-in', async (_verb, handler) => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await handler(tree());
    expect(res.status).toBe(404);
  });

  it('never reaches the unauthenticated Keystatic handler', async () => {
    // The exact request that returned HTTP 200 and a 154-entry file inventory from
    // the live box on 2026-08-24: the `no-cors: 1` header is Keystatic local mode's
    // ONLY guard, so this must die at our gate, not at theirs.
    vi.stubEnv('NODE_ENV', 'production');
    innerHandler.GET.mockClear();
    innerHandler.POST.mockClear();

    await GET(tree());
    await POST(tree());

    expect(innerHandler.GET).not.toHaveBeenCalled();
    expect(innerHandler.POST).not.toHaveBeenCalled();
  });

  it('setting only the public flag does not reopen it', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'true');
    expect((await GET(tree())).status).toBe(404);
  });
});
