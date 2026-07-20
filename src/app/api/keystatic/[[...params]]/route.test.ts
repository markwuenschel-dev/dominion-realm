import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Keystatic OAuth origin resolution (audit CAND-23). The security contract is:
 * the public origin for the GitHub `redirect_uri` comes from deploy-time env
 * (`KEYSTATIC_URL` → `SITE_URL`) and NEVER from a request header, so a spoofed
 * `x-forwarded-host` cannot steer the auth path. `makeRouteHandler` is mocked so
 * importing the route needs no GitHub credentials.
 */
vi.mock('@keystatic/next/route-handler', () => ({
  makeRouteHandler: () => ({ GET: vi.fn(), POST: vi.fn() }),
}));

import { withPublicOrigin } from './route';
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
