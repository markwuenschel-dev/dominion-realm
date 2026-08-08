/**
 * The site's security response headers, in one place so a test can read the same
 * list the server sends.
 *
 * This lives in `scripts/lib` next to `public-env.mjs` because `next.config.mjs`
 * is ESM JavaScript and cannot import a `.ts` module at config-load time.
 *
 * Why here and not in the Caddy reverse proxy: Caddy's config is in a different
 * repository. A header enforced there is invisible to this repo's CI, so nothing
 * here could ever prove it is still set. The whole point of this list is that
 * `security-headers.test.ts` can fail when someone weakens it.
 *
 * On the absent Content-Security-Policy: the only CSP directive set is
 * `frame-ancestors`. A real script-src policy needs a per-request nonce, and in
 * the Next App Router a nonce forces dynamic rendering on every page — nonces are
 * injected during SSR, and a statically-generated page has no request to carry
 * one. Three inline scripts exist today (the theme flash-preventer in
 * `src/app/layout.tsx` and the two GA4 scripts in `src/components/Analytics.tsx`),
 * plus the App Router's own streaming payload scripts. Turning this static site
 * dynamic to cover them is a real architectural decision and is deliberately not
 * bundled into "add some headers".
 */

/** @type {ReadonlyArray<{ key: string, value: string }>} */
export const SECURITY_HEADERS = Object.freeze([
  // Do not let a browser second-guess a declared Content-Type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking. X-Frame-Options for old agents, frame-ancestors for the ones
  // that implement CSP's framing directive.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // Send the origin cross-site, the full path same-origin. Keeps referrer
  // analytics working without leaking reader paths outward.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The site asks for none of these; say so rather than relying on a prompt the
  // reader has to decline.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Two years, subdomains included. Safe because the only host we serve is
  // HTTPS-only behind Caddy with a real Let's Encrypt certificate. `preload` is
  // NOT set — that is a one-way door and belongs to a domain decision that has
  // not been made yet.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]);

/**
 * The `headers()` entry Next expects: every header, on every path.
 *
 * @returns {Promise<Array<{ source: string, headers: Array<{ key: string, value: string }> }>>}
 */
export async function securityHeaderRules() {
  return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }];
}
