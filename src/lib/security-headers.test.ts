import { describe, expect, it } from 'vitest';
// Plain ESM helper shared with next.config.mjs, which cannot import a .ts module
// at config-load time. Its shape is declared with JSDoc, so tsc types it here.
import { SECURITY_HEADERS, securityHeaderRules } from '../../scripts/lib/security-headers.mjs';

/**
 * These headers were absent entirely until 2026-08-08 — no CSP, HSTS,
 * frame-ancestors or referrer policy anywhere in the repo. The point of this
 * file is that they cannot go absent again quietly: weakening any value below
 * fails CI rather than shipping.
 *
 * The assertions are deliberately exact rather than "contains a CSP". A test
 * that only checks a key exists would pass against
 * `Permissions-Policy: camera=*`.
 */

type Header = { key: string; value: string };

const byKey = (key: string): Header | undefined =>
  (SECURITY_HEADERS as Header[]).find((h) => h.key === key);

describe('security headers', () => {
  it('applies to every path, not just the home page', async () => {
    const rules = await securityHeaderRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
    expect(rules[0].headers).toEqual([...(SECURITY_HEADERS as Header[])]);
  });

  it('sets every header the site depends on', () => {
    const keys = (SECURITY_HEADERS as Header[]).map((h) => h.key);
    expect(keys).toEqual([
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ]);
  });

  it('refuses MIME sniffing', () => {
    expect(byKey('X-Content-Type-Options')?.value).toBe('nosniff');
  });

  it('cannot be framed, by either mechanism', () => {
    expect(byKey('X-Frame-Options')?.value).toBe('DENY');
    expect(byKey('Content-Security-Policy')?.value).toContain("frame-ancestors 'none'");
  });

  it('leaks the origin cross-site but never the path', () => {
    expect(byKey('Referrer-Policy')?.value).toBe('strict-origin-when-cross-origin');
  });

  it('denies the device permissions the site never asks for', () => {
    const value = byKey('Permissions-Policy')?.value ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation']) {
      expect(value).toContain(`${feature}=()`);
    }
    // `feature=*` would grant it to everyone — the exact mistake this guards.
    expect(value).not.toMatch(/=\*/);
  });

  it('pins HSTS for two years without committing to preload', () => {
    const value = byKey('Strict-Transport-Security')?.value ?? '';
    const maxAge = Number(/max-age=(\d+)/.exec(value)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(value).toContain('includeSubDomains');
    // preload is a one-way door: submitting the host to the browser preload list
    // is effectively irreversible, and this site's domain is still undecided.
    expect(value).not.toContain('preload');
  });

  it('never ships an empty header value', () => {
    for (const header of SECURITY_HEADERS as Header[]) {
      expect(header.value.trim()).not.toBe('');
    }
  });
});
