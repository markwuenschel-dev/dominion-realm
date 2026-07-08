/**
 * Sanity connection constants (ADR-0011). Read from `NEXT_PUBLIC_` env so they
 * reach the client Studio bundle; the projectId is non-secret (it appears in
 * every request URL), so a hardcoded fallback keeps local dev and CI builds
 * working without any env setup. Override in Railway / `.env` if it ever changes.
 *
 * The write token (SANITY_API_WRITE_TOKEN) is a SECRET and lives only in the
 * server-side sync/migration scripts — never here, never in the client bundle.
 */
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'zwq04v8v';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';

// Pin the API version to a fixed date so query behaviour never shifts under us.
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01';
