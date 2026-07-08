import { createClient } from 'next-sanity';
import { projectId, dataset, apiVersion } from './env';

/**
 * Read-only Sanity client for the site's runtime image reads (ADR-0011, Phase 3).
 *
 * The `production` dataset is publicly readable, so no token is needed — and none
 * is used here on purpose: this client only ever reads published documents. The
 * write token stays confined to the server-side migration/sync scripts. `useCdn`
 * serves reads from Sanity's cached API edge (fast, eventually-consistent), which
 * is correct for published media; on-demand revalidation (Phase 3 webhook) is what
 * refreshes a page after an edit, not client freshness.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});
