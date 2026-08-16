import fg from 'fast-glob';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { RELATIONSHIP_COLLECTIONS, RELATIONSHIP_COLLECTION_UNSET } from './relationshipCollections';
import { REVEAL_TIERS } from './reveal';

/**
 * Content engine core — Zod-validated Markdown/MDX loaders shared by the Next
 * app (`content.ts` re-exports with `server-only`) and build-time scripts
 * (CAND-05). No React / `server-only` here so `tsx` scripts can import it.
 */

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

const revealEnum = z.enum(REVEAL_TIERS);

/**
 * Relationship collection constraint. Keystatic may write the sentinel `unset`
 * (see RELATIONSHIP_COLLECTION_OPTIONS); that means "no constraint" and must
 * parse to `undefined` so a CMS-default save never fails the build (audit
 * CAND-01). Exported for the fitness test that pins write ⊆ read.
 */
export const relationshipCollectionSchema = z.preprocess(
  (value) => (value === RELATIONSHIP_COLLECTION_UNSET || value === '' ? undefined : value),
  z.enum(RELATIONSHIP_COLLECTIONS).optional(),
);

const relationship = z.object({
  entry: z.string(),
  collection: relationshipCollectionSchema,
  label: z.string().optional(),
  /** Optional explicit tier for this link; the effective tier is the higher of
   *  this and the target entry's own reveal (see `resolveRelationships`). */
  reveal: revealEnum.optional(),
});

/** Shared codex fields (image is a string path here, resolved to a URL below). */
const codexBase = z.object({
  name: z.string(),
  summary: z.string(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  reveal: revealEnum,
  relationships: z.array(relationship).default([]),
  draft: z.boolean().default(false),
});

const schemas = {
  characters: codexBase.extend({
    role: z.string(),
    aliases: z.array(z.string()).default([]),
    eyeStage: z.number().int().min(1).max(6).optional(),
    status: z.enum(['alive', 'dead', 'unknown']).default('unknown'),
  }),
  concepts: codexBase.extend({
    kind: z.enum(['magic-system', 'artifact', 'phenomenon', 'term']).default('term'),
    stage: z.number().int().min(1).max(6).optional(),
  }),
  factions: codexBase.extend({
    kind: z.enum(['faction', 'people', 'threat']).default('faction'),
  }),
  places: codexBase.extend({
    region: z.string().optional(),
    timeline: z.string().optional(),
    // Optional map position as a percent (0–100) of the /map figure — both must
    // be present for the place to get an interactive marker. Optional so every
    // existing entry still validates and the build stays green.
    mapX: z.number().min(0).max(100).optional(),
    mapY: z.number().min(0).max(100).optional(),
  }),
  journal: z.object({
    title: z.string(),
    summary: z.string(),
    category: z.enum(['field-notes', 'from-the-desk']),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    reveal: revealEnum,
    draft: z.boolean().default(false),
  }),
  reading: z.object({
    title: z.string(),
    kind: z.enum(['prologue', 'chapter']).default('chapter'),
    order: z.number(),
    summary: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
  timeline: z.object({
    title: z.string(),
    /** In-world era label, e.g. "Before the Waking" — free text, not a date. */
    when: z.string(),
    /** Sort key along the spine (ascending). */
    order: z.number(),
    summary: z.string(),
    reveal: revealEnum,
    /** Optional cross-link to the codex entry this beat centers on. */
    relatedEntry: relationship.optional(),
    draft: z.boolean().default(false),
  }),
} as const;

export type CollectionName = keyof typeof schemas;
export const CODEX_COLLECTIONS = ['characters', 'concepts', 'factions', 'places'] as const;
export type CodexCollection = (typeof CODEX_COLLECTIONS)[number];

export interface Entry<C extends CollectionName> {
  collection: C;
  /** Slug derived from the filename (no extension) — the URL id. */
  id: string;
  data: z.infer<(typeof schemas)[C]>;
  /** Raw MDX body, compiled by <MdxBody>. */
  body: string;
}

/**
 * A codex entry as a discriminated union over `collection`: each member pairs a
 * collection literal with its own parsed schema, so `entry.collection === 'places'`
 * narrows `entry.data` to the places shape. `Entry<CodexCollection>` would instead
 * fuse them into one type whose `collection` and `data` vary independently — no
 * narrowing, which is what forced the casts and `'in'` probes at every call site.
 */
export type CodexEntry = { [C in CodexCollection]: Entry<C> }[CodexCollection];
export type JournalEntry = Entry<'journal'>;
export type ReadingEntry = Entry<'reading'>;
export type TimelineEntry = Entry<'timeline'>;

/**
 * How draft entries are filtered after Zod parse.
 * - `env`: drop drafts when `NODE_ENV === 'production'` (app default)
 * - `include`: keep drafts (Studio manifest, media migrate)
 * - `exclude`: always drop drafts (download sample generators)
 */
export type DraftPolicy = 'env' | 'include' | 'exclude';

/** Rewrite a frontmatter image path to its public /content-media URL. */
export function resolveImage(collection: string, image: string | undefined): string | undefined {
  if (!image) return undefined;
  // An absolute path is already a public URL. Keystatic writes per-entry asset
  // folders and stores `/content-media/<collection>/<slug>/<file>`, which the
  // subpath-preserving media copy serves verbatim — pass it through unchanged.
  if (image.startsWith('/')) return image;
  // A legacy relative './X.png' beside the entry resolves to its copied URL.
  const base = image
    .replace(/^\.?\//, '')
    .split('/')
    .pop();
  return base ? `/content-media/${collection}/${base}` : undefined;
}

/**
 * Absolute path on disk for a declared frontmatter image, or `undefined` if the
 * file isn't there. One rule for the three path shapes:
 *   - `/content-media/<rest>` → `src/content/<rest>` (Keystatic source), falling
 *     back to `public/<…>` (the media-copy output) if the source isn't present;
 *   - other absolute `/…` → `public/<…>`;
 *   - a relative `./X.png` → resolved beside the entry file (`entryDir`).
 * The single home for the content-media/public/relative disambiguation that was
 * spelled three subtly different ways (resolveImage, imageSourcePath, the loader).
 */
function declaredDiskPath(declared: string, entryDir?: string): string | undefined {
  if (declared.startsWith('/content-media/')) {
    const underContent = path.join(CONTENT_DIR, declared.slice('/content-media/'.length));
    if (fs.existsSync(underContent)) return underContent;
    const underPublic = path.join(process.cwd(), 'public', declared.slice(1));
    return fs.existsSync(underPublic) ? underPublic : undefined;
  }
  if (declared.startsWith('/')) {
    const underPublic = path.join(process.cwd(), 'public', declared.slice(1));
    return fs.existsSync(underPublic) ? underPublic : undefined;
  }
  if (entryDir) {
    const abs = path.resolve(entryDir, declared);
    return fs.existsSync(abs) ? abs : undefined;
  }
  return undefined;
}

/**
 * Absolute path on disk for a resolved `/content-media/...` (or other public)
 * image URL. Prefers `src/content` (Keystatic source), then `public/`. A resolved
 * URL never has a relative shape, so it needs no `entryDir`.
 */
export function imageSourcePath(image: string | undefined): string | undefined {
  return image ? declaredDiskPath(image) : undefined;
}

/** A declared frontmatter image resolved once to its public URL, its on-disk
 *  source, and whether that source exists. The one seam for "how a frontmatter
 *  image maps to a URL and a file"; the loader reads `exists` to drop an image
 *  wired ahead of its art. */
export interface ContentImage {
  url: string | undefined;
  diskPath: string | undefined;
  exists: boolean;
}

export function contentImage(
  collection: string,
  declared: string | undefined,
  entryDir?: string,
): ContentImage {
  if (!declared) return { url: undefined, diskPath: undefined, exists: false };
  const diskPath = declaredDiskPath(declared, entryDir);
  return { url: resolveImage(collection, declared), diskPath, exists: diskPath !== undefined };
}

/**
 * The pure draft filter behind every getter's `drafts` argument — exported as a
 * seam so the three `DraftPolicy` branches can be proven against an in-memory
 * fixture corpus (CAND-24) instead of the live content tree, whose draft count
 * can drift to zero and make a corpus-dependent assertion pass vacuously.
 */
export function applyDraftPolicy<C extends CollectionName>(
  entries: Entry<C>[],
  drafts: DraftPolicy,
): Entry<C>[] {
  if (drafts === 'include') return entries;
  if (drafts === 'exclude') {
    return entries.filter((e) => !(e.data as { draft?: boolean }).draft);
  }
  // Read NODE_ENV at call time (not import time) so the draft gate is honored
  // even when the environment is set after this module loads — and so tests can
  // exercise both branches without module-reset gymnastics.
  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? entries.filter((e) => !(e.data as { draft?: boolean }).draft) : entries;
}

/**
 * Isolated Zod parse for one collection's frontmatter — no filesystem, no
 * draft filter, no image rewrite. The live loader wraps the same schema in a
 * file-path error; this seam lets tests (CAND-46) prove a bad reveal / missing
 * name / invalid eyeStage fails without planting a broken file or running next
 * build.
 */
export function parseCollectionFrontmatter<C extends CollectionName>(
  collection: C,
  data: unknown,
): z.infer<(typeof schemas)[C]> {
  return schemas[collection].parse(data) as z.infer<(typeof schemas)[C]>;
}

export function loadCollection<C extends CollectionName>(
  collection: C,
  drafts: DraftPolicy = 'env',
): Entry<C>[] {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];
  const files = fg.sync('**/*.{md,mdx}', { cwd: dir });
  const schema = schemas[collection];

  const entries = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data, content } = matter(raw);
    let parsed: z.infer<(typeof schemas)[C]>;
    try {
      parsed = schema.parse(data) as z.infer<(typeof schemas)[C]>;
    } catch (err) {
      throw new Error(
        `Invalid frontmatter in src/content/${collection}/${file}: ${(err as Error).message}`,
        { cause: err },
      );
    }
    if ('image' in parsed && parsed.image) {
      // Guard: only keep the image if its source file actually exists. A
      // declared-but-missing path (frontmatter wired ahead of the art) otherwise
      // resolves to a URL that 404s at runtime, since the media-copy step silently
      // skips files that aren't there. `contentImage` owns the
      // content-media/public/relative resolution (Keystatic paths live under
      // src/content, a bare relative path beside the `.md`); a content-media path
      // absent from src/content is now also honored from public/ (the copy output).
      const img = contentImage(
        collection,
        parsed.image as string,
        path.dirname(path.join(dir, file)),
      );
      (parsed as { image?: string }).image = img.exists ? img.url : undefined;
    }
    return {
      collection,
      id: file.replace(/\.mdx?$/, ''),
      data: parsed,
      body: content,
    } satisfies Entry<C>;
  });

  return applyDraftPolicy(entries, drafts);
}

/* ---- Typed getters (consumed by the lib/codex|journal|reading helpers) ---- */

export function getCodexEntries(drafts: DraftPolicy = 'env'): CodexEntry[] {
  // Each loadCollection(c) yields entries correlated to its own collection; the
  // flatMap's union-typed `c` erases that pairing (Entry<CodexCollection>), so we
  // restore the discriminated union at this one seam. Runtime is already correct.
  return CODEX_COLLECTIONS.flatMap((c) => loadCollection(c, drafts) as CodexEntry[]).sort((a, b) =>
    a.data.name.localeCompare(b.data.name),
  );
}

export function getCodexEntry(
  collection: CodexCollection,
  id: string,
  drafts: DraftPolicy = 'env',
): CodexEntry | undefined {
  return (loadCollection(collection, drafts) as CodexEntry[]).find((e) => e.id === id);
}

export function getJournalEntries(drafts: DraftPolicy = 'env'): JournalEntry[] {
  return loadCollection('journal', drafts).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

export function getJournalEntry(id: string, drafts: DraftPolicy = 'env'): JournalEntry | undefined {
  return loadCollection('journal', drafts).find((e) => e.id === id);
}

export function getReadingEntries(drafts: DraftPolicy = 'env'): ReadingEntry[] {
  return loadCollection('reading', drafts).sort((a, b) => a.data.order - b.data.order);
}

export function getReadingEntry(id: string, drafts: DraftPolicy = 'env'): ReadingEntry | undefined {
  return loadCollection('reading', drafts).find((e) => e.id === id);
}

export function getTimelineEntries(drafts: DraftPolicy = 'env'): TimelineEntry[] {
  return loadCollection('timeline', drafts).sort((a, b) => a.data.order - b.data.order);
}
