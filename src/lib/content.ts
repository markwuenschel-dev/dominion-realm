import 'server-only';
import { cache } from 'react';
import {
  getCodexEntries as getCodexEntriesUncached,
  getCodexEntry as getCodexEntryUncached,
  getJournalEntries as getJournalEntriesUncached,
  getJournalEntry as getJournalEntryUncached,
  getReadingEntries as getReadingEntriesUncached,
  getReadingEntry as getReadingEntryUncached,
  getTimelineEntries as getTimelineEntriesUncached,
} from './contentCore';

/**
 * The content engine (migrated from Astro Content Collections, ADR-0002/0010).
 *
 * Loads the six Markdown/MDX collections under `src/content/`, validates each
 * entry's frontmatter against a Zod schema, and returns typed entries. The Zod
 * `.parse()` THROWS on a malformed entry (e.g. a bad `reveal` tier), so calling
 * a loader from `generateStaticParams`/a page fails `next build` rather than
 * shipping broken content — preserving the Astro-era build gate.
 *
 * Bodies are returned as raw MDX strings; `<MdxBody>` compiles them. Images in
 * frontmatter are rewritten to `/content-media/<collection>/<file>` URLs, which
 * `scripts/copy-content-media.mjs` populates into `public/` at prebuild.
 *
 * Implementation lives in `contentCore.ts` (no `server-only`) so build scripts
 * can share the same Zod + slug rules without importing this server boundary.
 */

/**
 * Request-memoized getters (CAND-12). Every page/`lib/*` helper imports these
 * from here (the server boundary), so wrapping the raw `contentCore` getters in
 * React `cache` dedupes the `fg.sync` + `readFileSync` corpus scan when the same
 * getter runs more than once in a request tree. `contentCore` itself stays
 * React-free so `tsx` build scripts can import it; outside a React request scope
 * (vitest, scripts) `cache` is a pass-through, so the call-time NODE_ENV draft
 * gate and env-stubbing tests behave unchanged.
 */
export const getCodexEntries = cache(getCodexEntriesUncached);
export const getCodexEntry = cache(getCodexEntryUncached);
export const getJournalEntries = cache(getJournalEntriesUncached);
export const getJournalEntry = cache(getJournalEntryUncached);
export const getReadingEntries = cache(getReadingEntriesUncached);
export const getReadingEntry = cache(getReadingEntryUncached);
export const getTimelineEntries = cache(getTimelineEntriesUncached);

export {
  CODEX_COLLECTIONS,
  contentImage,
  imageSourcePath,
  loadCollection,
  relationshipCollectionSchema,
  resolveImage,
  type CodexCollection,
  type CodexEntry,
  type CollectionName,
  type ContentImage,
  type DraftPolicy,
  type Entry,
  type JournalEntry,
  type ReadingEntry,
  type TimelineEntry,
} from './contentCore';
