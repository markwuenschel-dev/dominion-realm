import 'server-only';
import fg from 'fast-glob';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { REVEAL_TIERS } from './reveal';

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
 */

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

const revealEnum = z.enum(REVEAL_TIERS);

const relationship = z.object({
  entry: z.string(),
  collection: z.enum(['characters', 'concepts', 'factions', 'places']).optional(),
  label: z.string().optional(),
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

/** Rewrite a frontmatter image path to its public /content-media URL. */
export function resolveImage(collection: string, image: string | undefined): string | undefined {
  if (!image) return undefined;
  const base = image
    .replace(/^\.?\//, '')
    .split('/')
    .pop();
  return base ? `/content-media/${collection}/${base}` : undefined;
}

function loadCollection<C extends CollectionName>(collection: C): Entry<C>[] {
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
      (parsed as { image?: string }).image = resolveImage(collection, parsed.image as string);
    }
    return {
      collection,
      id: file.replace(/\.mdx?$/, ''),
      data: parsed,
      body: content,
    } satisfies Entry<C>;
  });

  // Read NODE_ENV at call time (not import time) so the draft gate is honored
  // even when the environment is set after this module loads — and so tests can
  // exercise both branches without module-reset gymnastics.
  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? entries.filter((e) => !(e.data as { draft?: boolean }).draft) : entries;
}

/* ---- Raw loaders (consumed by the lib/codex|journal|reading helpers) ---- */

export function getCodexEntries(): CodexEntry[] {
  // Each loadCollection(c) yields entries correlated to its own collection; the
  // flatMap's union-typed `c` erases that pairing (Entry<CodexCollection>), so we
  // restore the discriminated union at this one seam. Runtime is already correct.
  return CODEX_COLLECTIONS.flatMap((c) => loadCollection(c) as CodexEntry[]).sort((a, b) =>
    a.data.name.localeCompare(b.data.name),
  );
}

export function getCodexEntry(collection: CodexCollection, id: string): CodexEntry | undefined {
  return (loadCollection(collection) as CodexEntry[]).find((e) => e.id === id);
}

export function getJournalEntries(): JournalEntry[] {
  return loadCollection('journal').sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

export function getJournalEntry(id: string): JournalEntry | undefined {
  return loadCollection('journal').find((e) => e.id === id);
}

export function getReadingEntries(): ReadingEntry[] {
  return loadCollection('reading').sort((a, b) => a.data.order - b.data.order);
}

export function getReadingEntry(id: string): ReadingEntry | undefined {
  return loadCollection('reading').find((e) => e.id === id);
}
