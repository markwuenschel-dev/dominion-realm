/**
 * Who may reach the Keystatic API — decided independently of storage mode.
 *
 * **Storage mode is not authorization.** `keystatic.config.ts` selects `local`
 * storage whenever `NEXT_PUBLIC_KEYSTATIC_GITHUB` is anything other than the exact
 * string `true`, and `@keystatic/core`'s local-mode handler has no authentication:
 * its only guard is a `no-cors: 1` request header that the caller sets. So a public
 * flag that is missing, blank, or misspelled on the production box silently turns
 * the CMS into an unauthenticated read-and-write surface over the container's
 * filesystem.
 *
 * That is not hypothetical. Probed 2026-08-24 against the live deploy:
 * `GET /api/keystatic/tree` with `no-cors: 1` returned HTTP 200 and a 154-entry
 * inventory of the running container; the same request without the header returned
 * 400. See INT-07 in the campaign contract under `.project-intelligence/`.
 *
 * The gate here therefore **fails closed** and does not derive intent from
 * capability. A GitHub App secret being present means someone *could* authorize
 * writes — never that they *meant* to expose them (campaign decision Q21), so the
 * secrets are checked in addition to an explicit opt-in, never instead of one.
 *
 * Two independent switches must agree:
 *
 * - `KEYSTATIC_AUTHORING` — server-only. The actual authority. Never `NEXT_PUBLIC_`,
 *   so it cannot be read from the client bundle and cannot be frozen into an image
 *   at build time.
 * - `NEXT_PUBLIC_KEYSTATIC_GITHUB` — the existing public flag. Still decides what the
 *   browser editor renders, and nothing more.
 *
 * Requiring both closes the two-clocks hazard (campaign decision Q21): the client
 * resolves its flag at *build* time and the server reads `process.env` at *request*
 * time, so repairing only the deploy env would fix the server while leaving the
 * client in local mode, and repairing only the build args would do the reverse.
 * Disagreement is a misconfiguration, and a misconfigured CMS stays shut.
 *
 * Outside production the gate is open, so `pnpm dev` keeps its local-mode editor
 * with no secrets and no ceremony. The exposure this guards against needs a
 * publicly reachable server; a dev machine's localhost is not one.
 */

/** Env names whose values must be present and non-blank before writes are enabled. */
const REQUIRED_SECRETS = [
  'KEYSTATIC_GITHUB_CLIENT_ID',
  'KEYSTATIC_GITHUB_CLIENT_SECRET',
  'KEYSTATIC_SECRET',
] as const;

export type KeystaticAuthoringState =
  | { enabled: true; reason: 'non-production' | 'authorized' }
  | { enabled: false; reason: 'not-opted-in' | 'flags-disagree' | 'missing-secrets' };

/**
 * Read the env with the house idiom: `?.trim() || ''`, never `??`.
 *
 * The deploy env ships variables present-but-empty (ADR-0012, Consequences), and
 * `''` is not nullish — `??` would forward the empty string as if it were a real
 * value. `scripts/lib/public-env.mjs` states this rule; this module obeys it.
 */
const read = (name: string): string => process.env[name]?.trim() || '';

/**
 * Whether the Keystatic API may serve this request.
 *
 * Returns the reason as well as the verdict so a caller can log *why* authoring is
 * shut without echoing any env value back to the client.
 */
export function keystaticAuthoringState(
  env: { nodeEnv?: string } = { nodeEnv: process.env.NODE_ENV },
): KeystaticAuthoringState {
  if (env.nodeEnv !== 'production') return { enabled: true, reason: 'non-production' };

  const serverOptIn = read('KEYSTATIC_AUTHORING') === 'true';
  if (!serverOptIn) return { enabled: false, reason: 'not-opted-in' };

  // The public flag must agree exactly. Storage mode still follows this flag, so a
  // server that authorized writes while the config resolved `local` would be
  // authorizing the unauthenticated handler — the precise state INT-07 found live.
  if (read('NEXT_PUBLIC_KEYSTATIC_GITHUB') !== 'true') {
    return { enabled: false, reason: 'flags-disagree' };
  }

  if (REQUIRED_SECRETS.some((name) => read(name) === '')) {
    return { enabled: false, reason: 'missing-secrets' };
  }

  return { enabled: true, reason: 'authorized' };
}

/** Convenience predicate for callers that do not need the reason. */
export const keystaticAuthoringEnabled = (): boolean => keystaticAuthoringState().enabled;

/**
 * The response served when authoring is shut.
 *
 * 404, not 403: a disabled CMS should be indistinguishable from one that was never
 * deployed. 403 would confirm the route exists and invite probing for the state
 * that opens it. The body is deliberately contentless — no reason, no env name.
 */
export function keystaticDisabledResponse(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
