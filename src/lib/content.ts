import 'server-only';

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

export {
  CODEX_COLLECTIONS,
  contentImage,
  getCodexEntries,
  getCodexEntry,
  getJournalEntries,
  getJournalEntry,
  getReadingEntries,
  getReadingEntry,
  getTimelineEntries,
  imageSourcePath,
  loadCollection,
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
