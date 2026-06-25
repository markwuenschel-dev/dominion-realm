import { config, fields, collection } from '@keystatic/core';
import { REVEAL_TIERS, TIER_LABELS } from './src/lib/reveal';

/**
 * Keystatic CMS (ADR-0009) — a browser-based editor that commits straight to
 * this repo. It runs ONLY on the Netlify (SSR) deploy; the GitHub Pages build
 * stays pure-static and ships none of this. See `astro.config.mjs`.
 *
 * Every field below mirrors `src/content.config.ts` so that existing entries
 * load unchanged and anything authored here validates against the Astro
 * Content Collections schema. The Markdown *body* round-trips into the same
 * `src/content/<collection>/*.md` files via `format.contentField`.
 */

/** Reveal tier as a Keystatic select, sourced from the single source of truth. */
const revealField = fields.select({
  label: 'Reveal tier',
  description:
    'Minimum reveal tier for this entry to appear (ADR-0004). Required — there is no safe default.',
  options: REVEAL_TIERS.map((tier) => ({ label: TIER_LABELS[tier], value: tier })),
  // Keystatic selects require a default; `teaser` is the marketing-safe baseline
  // and matches the spoiler-safe intent, but authors must still review it.
  defaultValue: 'teaser',
});

/** Cross-links to other codex entries — mirrors the `relationships` array. */
const relationshipsField = fields.array(
  fields.object({
    entry: fields.text({ label: 'Entry slug' }),
    collection: fields.select({
      label: 'Collection',
      options: [
        { label: '(unset)', value: 'unset' },
        { label: 'Characters', value: 'characters' },
        { label: 'Concepts', value: 'concepts' },
        { label: 'Factions', value: 'factions' },
        { label: 'Places', value: 'places' },
      ],
      defaultValue: 'unset',
    }),
    label: fields.text({ label: 'Label', validation: { isRequired: false } }),
  }),
  {
    label: 'Relationships',
    itemLabel: (props) => props.fields.entry.value || 'New relationship',
  },
);

/**
 * Shared codex fields (name, summary, image, reveal, relationships, draft).
 * `name` is the slug field, so it is supplied by `slugField` on each
 * collection rather than appearing here.
 */
const codexBaseFields = {
  summary: fields.text({
    label: 'Summary',
    description: 'One- or two-sentence spoiler-safe summary (used in cards + OG).',
    multiline: true,
  }),
  image: fields.image({
    label: 'Image',
    directory: 'src/content/_assets/images',
    publicPath: '../_assets/images/',
    validation: { isRequired: false },
  }),
  imageAlt: fields.text({ label: 'Image alt text', validation: { isRequired: false } }),
  reveal: revealField,
  relationships: relationshipsField,
  draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
};

/** Markdoc body stored as the Markdown file content (extension `.md`). */
const bodyField = fields.markdoc({ label: 'Body', extension: 'md' });

export default config({
  // GitHub storage needs the Keystatic GitHub App secrets. They exist on the
  // Railway deploy (so editors commit straight to the repo), but not at build /
  // CI / local time — so fall back to `local` storage when the client id is
  // absent. This keeps `next build` (which evaluates the /api/keystatic route)
  // from failing without secrets, while production still uses github mode.
  storage: process.env.KEYSTATIC_GITHUB_CLIENT_ID
    ? { kind: 'github', repo: { owner: 'markwuenschel-dev', name: 'dominion-realm' } }
    : { kind: 'local' },
  ui: {
    brand: { name: 'The Dominion Realm' },
  },
  collections: {
    characters: collection({
      label: 'Characters',
      slugField: 'name',
      path: 'src/content/characters/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        ...codexBaseFields,
        role: fields.text({ label: 'Role', description: 'e.g. "Protagonist · Ocular Anomaly".' }),
        aliases: fields.array(fields.text({ label: 'Alias' }), {
          label: 'Aliases',
          itemLabel: (props) => props.value || 'New alias',
        }),
        eyeStage: fields.integer({
          label: 'Eye stage',
          description: 'Current Neurochromatic Eyes stage (1–6), if applicable.',
          validation: { isRequired: false, min: 1, max: 6 },
        }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Alive', value: 'alive' },
            { label: 'Dead', value: 'dead' },
            { label: 'Unknown', value: 'unknown' },
          ],
          defaultValue: 'unknown',
        }),
        content: bodyField,
      },
    }),

    concepts: collection({
      label: 'Concepts',
      slugField: 'name',
      path: 'src/content/concepts/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        ...codexBaseFields,
        kind: fields.select({
          label: 'Kind',
          options: [
            { label: 'Magic system', value: 'magic-system' },
            { label: 'Artifact', value: 'artifact' },
            { label: 'Phenomenon', value: 'phenomenon' },
            { label: 'Term', value: 'term' },
          ],
          defaultValue: 'term',
        }),
        stage: fields.integer({
          label: 'Stage',
          description: 'Neurochromatic Eyes stage number (1–6), if applicable.',
          validation: { isRequired: false, min: 1, max: 6 },
        }),
        content: bodyField,
      },
    }),

    factions: collection({
      label: 'Factions',
      slugField: 'name',
      path: 'src/content/factions/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        ...codexBaseFields,
        kind: fields.select({
          label: 'Kind',
          options: [
            { label: 'Faction', value: 'faction' },
            { label: 'People', value: 'people' },
            { label: 'Threat', value: 'threat' },
          ],
          defaultValue: 'faction',
        }),
        content: bodyField,
      },
    }),

    places: collection({
      label: 'Places',
      slugField: 'name',
      path: 'src/content/places/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        ...codexBaseFields,
        region: fields.text({ label: 'Region', validation: { isRequired: false } }),
        timeline: fields.text({
          label: 'Timeline',
          description: 'Free-form position on the world timeline, if relevant.',
          validation: { isRequired: false },
        }),
        content: bodyField,
      },
    }),

    journal: collection({
      label: 'Journal',
      slugField: 'title',
      path: 'src/content/journal/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        category: fields.select({
          label: 'Category',
          description: 'In-world "Field Notes" vs author-voice "From the Desk" (ADR-0003).',
          options: [
            { label: 'Field Notes', value: 'field-notes' },
            { label: 'From the Desk', value: 'from-the-desk' },
          ],
          defaultValue: 'field-notes',
        }),
        pubDate: fields.date({ label: 'Publish date' }),
        updatedDate: fields.date({ label: 'Updated date', validation: { isRequired: false } }),
        image: fields.image({
          label: 'Image',
          directory: 'src/content/_assets/images',
          publicPath: '../_assets/images/',
          validation: { isRequired: false },
        }),
        imageAlt: fields.text({ label: 'Image alt text', validation: { isRequired: false } }),
        reveal: revealField,
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: bodyField,
      },
    }),

    reading: collection({
      label: 'Reading Sample',
      slugField: 'title',
      path: 'src/content/reading/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        kind: fields.select({
          label: 'Kind',
          options: [
            { label: 'Prologue', value: 'prologue' },
            { label: 'Chapter', value: 'chapter' },
          ],
          defaultValue: 'chapter',
        }),
        order: fields.integer({
          label: 'Order',
          description: 'Sort key for reading order (and prev/next derivation).',
        }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        image: fields.image({
          label: 'Image',
          directory: 'src/content/_assets/images',
          publicPath: '../_assets/images/',
          validation: { isRequired: false },
        }),
        imageAlt: fields.text({ label: 'Image alt text', validation: { isRequired: false } }),
        // NOTE: the reading sample has NO reveal field by design (ADR-0004) —
        // the Prologue + Chapter One are open bait, published ungated.
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: bodyField,
      },
    }),
  },
});
