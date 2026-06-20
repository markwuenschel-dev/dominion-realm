import { defineCollection, type SchemaContext } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';
import { REVEAL_TIERS, type RevealTier } from './lib/reveal';

/**
 * Content model for the world hub (ADR-0002). Everything that grows over time —
 * the World Codex, the journal — lives as Markdown/MDX validated here, so a
 * malformed entry (e.g. a missing/invalid reveal tier) fails the build rather
 * than shipping.
 */

/** The reveal tier as a Zod enum, reused by every gated collection. */
const revealTier = z.enum([...REVEAL_TIERS] as [RevealTier, ...RevealTier[]]);

/** Names of the four codex collections, for typing cross-links. */
const CODEX_COLLECTIONS = ['characters', 'concepts', 'factions', 'places'] as const;

/**
 * Fields shared by every codex entry. Defined as a function because Astro's
 * `image()` helper is only available from the schema context; each codex
 * collection calls this and `.extend()`s its own fields on top.
 */
const codexBase = ({ image }: SchemaContext) =>
  z.object({
    /** Display name / title of the entry. */
    name: z.string(),
    /** One- or two-sentence spoiler-safe summary (used in cards + OG). */
    summary: z.string(),
    /** Optional portrait / key art, processed by Astro's image pipeline. */
    image: image().optional(),
    imageAlt: z.string().optional(),
    /**
     * Minimum reveal tier for the entry to appear at all. Required, not
     * defaulted: ADR-0004 makes tiering every entry deliberate, and a silent
     * default could ship spoiler content as publicly visible.
     */
    reveal: revealTier,
    /**
     * Cross-links to other codex entries. Kept as plain slugs (not Astro
     * `reference()`s) so links can point across any of the four collections
     * and won't fail the build while the codex is still being filled in.
     */
    relationships: z
      .array(
        z.object({
          entry: z.string(),
          collection: z.enum(CODEX_COLLECTIONS).optional(),
          label: z.string().optional(),
        }),
      )
      .default([]),
    /** Hide from production listings while drafting. */
    draft: z.boolean().default(false),
  });

const codexLoader = (dir: (typeof CODEX_COLLECTIONS)[number]) =>
  glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${dir}` });

const characters = defineCollection({
  loader: codexLoader('characters'),
  schema: (ctx) =>
    codexBase(ctx).extend({
      /** Role / epithet, e.g. "Protagonist · Ocular Anomaly". */
      role: z.string(),
      aliases: z.array(z.string()).default([]),
      /** Current Eye of Meszkhal stage (1–6), if the character has the Eyes. */
      eyeStage: z.number().int().min(1).max(6).optional(),
      status: z.enum(['alive', 'dead', 'unknown']).default('unknown'),
    }),
});

const concepts = defineCollection({
  loader: codexLoader('concepts'),
  schema: (ctx) =>
    codexBase(ctx).extend({
      kind: z
        .enum(['magic-system', 'artifact', 'phenomenon', 'term'])
        .default('term'),
      /**
       * For the Eyes of Meszkhal: the stage number (1–6) so the /eyes page can
       * render its progression over structured concept data.
       */
      stage: z.number().int().min(1).max(6).optional(),
    }),
});

const factions = defineCollection({
  loader: codexLoader('factions'),
  schema: (ctx) =>
    codexBase(ctx).extend({
      kind: z.enum(['faction', 'people', 'threat']).default('faction'),
    }),
});

const places = defineCollection({
  loader: codexLoader('places'),
  schema: (ctx) =>
    codexBase(ctx).extend({
      region: z.string().optional(),
      /** Free-form position on the world timeline, if relevant. */
      timeline: z.string().optional(),
    }),
});

const journal = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/journal' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      /**
       * The two streams (ADR-0003): in-world "Field Notes" vs author-voice
       * "From the Desk". One collection, distinguished by this field.
       */
      category: z.enum(['field-notes', 'from-the-desk']),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      reveal: revealTier,
      draft: z.boolean().default(false),
    }),
});

export const collections = { characters, concepts, factions, places, journal };
