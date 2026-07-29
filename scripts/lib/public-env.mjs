/**
 * The one place that maps Astro-era public Variable names to the Next-era env
 * names the app reads.
 *
 * The repo Variables kept their Astro-era spelling (`PUBLIC_*`) through the
 * Next migration (ADR-0010) while the app reads `NEXT_PUBLIC_*`. That rename
 * used to live in three workflow files and nowhere else, so a local `.env`
 * carrying the Astro-era names resolved to nothing: `pnpm dev` ran without
 * analytics and with a dead signup form while CI resolved both. Two spellings,
 * three copies of the rule, no owner.
 *
 * Dependency-free and side-effect-free on purpose, so `next.config.mjs`, the
 * `tsx` scripts, the CI assert, and the Vitest suite can all import the same
 * rule rather than restating it.
 */

/** Next-era name → the Astro-era repo Variable it falls back to. */
export const PUBLIC_ENV_ALIASES = {
  NEXT_PUBLIC_SITE_URL: 'PUBLIC_SITE_URL',
  NEXT_PUBLIC_GA4_ID: 'PUBLIC_GA4_ID',
  NEXT_PUBLIC_KIT_FORM_ID: 'PUBLIC_KIT_FORM_ID',
};

/**
 * Ids the funnel cannot work without. `NEXT_PUBLIC_SITE_URL` is deliberately
 * absent: no Variable exists for it yet, and `src/lib/site.ts` falls back to
 * the canonical origin (ADR-0012 follow-up).
 */
export const REQUIRED_PUBLIC_IDS = ['NEXT_PUBLIC_GA4_ID', 'NEXT_PUBLIC_KIT_FORM_ID'];

/**
 * Resolve every public id from a source env. The Next-era name wins when set;
 * the Astro-era Variable is the fallback.
 *
 * A missing value resolves to `''`, not `undefined` — matching the
 * present-but-empty shape the deploy env already has, which is why callers use
 * `?.trim() || default` rather than `??` (ADR-0012, Consequences).
 *
 * @param {Record<string, string | undefined>} [source]
 * @returns {Record<string, string>}
 */
export function resolvePublicEnv(source = process.env) {
  /** @type {Record<string, string>} */
  const resolved = {};
  for (const [nextName, astroName] of Object.entries(PUBLIC_ENV_ALIASES)) {
    resolved[nextName] = (source[nextName] ?? source[astroName] ?? '').trim();
  }
  return resolved;
}

/**
 * Which required ids failed to resolve, reported by their *Variable* name —
 * the name whoever fixes it will actually look for in repo settings.
 *
 * @param {Record<string, string | undefined>} [source]
 * @returns {string[]}
 */
export function missingPublicIds(source = process.env) {
  const resolved = resolvePublicEnv(source);
  return REQUIRED_PUBLIC_IDS.filter((name) => !resolved[name]).map(
    (name) => PUBLIC_ENV_ALIASES[name],
  );
}
