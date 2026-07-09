import { createClient } from 'next-sanity';
import { projectId, dataset, apiVersion } from './env';

/**
 * Read-only Sanity client for the site's runtime image reads (ADR-0011, Phase 3).
 *
 * The `production` dataset is publicly readable, so no token is needed — and none
 * is used here on purpose: this client only ever reads published documents. The
 * write token stays confined to the server-side migration/sync scripts.
 *
 * `useCdn: false` is deliberate: every media read opts into the Next Data Cache
 * (tagged `sanity`), so results are already memoized and fast between edits. When
 * the `/api/revalidate` webhook busts that tag after a Studio edit, the refetch
 * must return *fresh* data — the API (not the ~60s edge cache) — for the change to
 * appear immediately. `useCdn: true` would re-serve a stale edge copy and defeat
 * the whole point of on-demand revalidation.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});
