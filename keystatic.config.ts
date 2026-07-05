import { config, fields, collection } from '@keystatic/core';
import { REVEAL_TIERS, TIER_LABELS } from './src/lib/reveal';

/**
 * Keystatic CMS (ADR-0009, amended by ADR-0010) — a browser-based editor that
 * commits straight to this repo. On Railway (a Node server) it ships with the
 * main deploy and is served under `/keystatic`, backed by the GitHub-OAuth
 * route handler at `/api/keystatic`.
 *
 * Every field below mirrors the Zod content schema in `src/lib/content.ts` so
 * that existing entries load unchanged and anything authored here validates
 * against the same schema. The Markdown *body* round-trips into the same
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
        // Optional position on the interactive /map, as a percent (0–100) of the
        // figure. Set BOTH to place a marker; leave blank to keep the place off
        // the map. Optional so existing entries validate unchanged.
        mapX: fields.number({
          label: 'Map X (0–100%)',
          description: 'Horizontal position on /map: 0 = far west, 100 = far east.',
          validation: { isRequired: false, min: 0, max: 100 },
        }),
        mapY: fields.number({
          label: 'Map Y (0–100%)',
          description: 'Vertical position on /map: 0 = far north, 100 = far south.',
          validation: { isRequired: false, min: 0, max: 100 },
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

    questions: collection({
      label: 'Questions',
      slugField: 'title',
      path: 'src/content/questions/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        qid: fields.text({ label: 'Question id', description: 'Display id, e.g. "Q001".' }),
        order: fields.integer({
          label: 'Order',
          description: 'Sort key along the bank (ascending).',
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Backend / API', value: 'backend' },
            { label: 'Python / Data-ML', value: 'python-ml' },
            { label: 'React / TypeScript', value: 'react-ts' },
            { label: 'SQL & Data Access', value: 'sql' },
            { label: 'Algorithms', value: 'algorithms' },
            { label: 'Testing & Review', value: 'testing' },
            { label: 'Java / Concurrency', value: 'concurrency' },
          ],
          defaultValue: 'backend',
        }),
        language: fields.select({
          label: 'Language',
          options: [
            { label: 'Java', value: 'java' },
            { label: 'Python', value: 'python' },
            { label: 'TypeScript', value: 'typescript' },
            { label: 'SQL', value: 'sql' },
          ],
          defaultValue: 'java',
        }),
        difficulty: fields.select({
          label: 'Difficulty (core question)',
          options: [
            { label: 'Mid · SE II', value: 'mid' },
            { label: 'Senior · SE III', value: 'senior' },
          ],
          defaultValue: 'mid',
        }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value || 'New tag',
        }),
        // NOTE: no reveal field — the interview banks are ungated, like reading.
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: bodyField,
      },
    }),

    // Scaffolded sibling of `questions` (same schema) for generated drills.
    drills: collection({
      label: 'Code Drills',
      slugField: 'title',
      path: 'src/content/drills/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        qid: fields.text({ label: 'Drill id', description: 'Display id, e.g. "D001".' }),
        order: fields.integer({
          label: 'Order',
          description: 'Sort key along the bank (ascending).',
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Backend / API', value: 'backend' },
            { label: 'Python / Data-ML', value: 'python-ml' },
            { label: 'React / TypeScript', value: 'react-ts' },
            { label: 'SQL & Data Access', value: 'sql' },
            { label: 'Algorithms', value: 'algorithms' },
            { label: 'Testing & Review', value: 'testing' },
            { label: 'Java / Concurrency', value: 'concurrency' },
          ],
          defaultValue: 'backend',
        }),
        language: fields.select({
          label: 'Language',
          options: [
            { label: 'Java', value: 'java' },
            { label: 'Python', value: 'python' },
            { label: 'TypeScript', value: 'typescript' },
            { label: 'SQL', value: 'sql' },
          ],
          defaultValue: 'java',
        }),
        difficulty: fields.select({
          label: 'Difficulty (core question)',
          options: [
            { label: 'Mid · SE II', value: 'mid' },
            { label: 'Senior · SE III', value: 'senior' },
          ],
          defaultValue: 'mid',
        }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value || 'New tag',
        }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: bodyField,
      },
    }),
  },
});
