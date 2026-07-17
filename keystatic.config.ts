import { config, fields, collection, singleton } from '@keystatic/core';
import { REVEAL_TIERS, TIER_LABELS } from './src/lib/reveal';
import {
  RELATIONSHIP_COLLECTIONS,
  RELATIONSHIP_COLLECTION_UNSET,
} from './src/lib/relationshipCollections';

/**
 * Keystatic CMS (ADR-0009, amended by ADR-0010) — a browser-based editor that
 * commits straight to this repo. On the EC2 deploy (a Node server) it ships with the
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
      description:
        '(unset) = match the slug across all collections. Sourced from relationshipCollections.ts so the CMS cannot write a value the Zod loader rejects.',
      options: [
        { label: '(unset)', value: RELATIONSHIP_COLLECTION_UNSET },
        ...RELATIONSHIP_COLLECTIONS.map((value) => ({
          label: value.charAt(0).toUpperCase() + value.slice(1),
          value,
        })),
      ],
      defaultValue: RELATIONSHIP_COLLECTION_UNSET,
    }),
    label: fields.text({ label: 'Label', validation: { isRequired: false } }),
  }),
  {
    label: 'Relationships',
    itemLabel: (props) => props.fields.entry.value || 'New relationship',
  },
);

/**
 * A per-collection image field. Keystatic writes an upload to
 * `src/content/<collection>/<slug>/<file>` (tracked in git) and stores the final
 * public URL `/content-media/<collection>/<slug>/<file>` — which the
 * subpath-preserving media copy (`scripts/copy-content-media.mjs`) serves
 * verbatim and `resolveImage` (`src/lib/content.ts`) passes straight through. So
 * a browser upload Just Works with no code change per entry.
 */
const codexImage = (collectionName: string) =>
  fields.image({
    label: 'Image',
    directory: `src/content/${collectionName}`,
    publicPath: `/content-media/${collectionName}/`,
    validation: { isRequired: false },
  });

/**
 * Shared codex fields (summary, alt, reveal, relationships, draft). `name` is the
 * slug field, and `image` is added per collection via `codexImage` (its directory
 * must name the collection), so neither appears here.
 */
const codexBaseFields = {
  summary: fields.text({
    label: 'Summary',
    description: 'One- or two-sentence spoiler-safe summary (used in cards + OG).',
    multiline: true,
  }),
  imageAlt: fields.text({ label: 'Image alt text', validation: { isRequired: false } }),
  reveal: revealField,
  relationships: relationshipsField,
  draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
};

/** Markdoc body stored as the Markdown file content (extension `.md`). */
const bodyField = fields.markdoc({ label: 'Body', extension: 'md' });

export default config({
  // Storage mode is chosen by a single PUBLIC flag, `NEXT_PUBLIC_KEYSTATIC_GITHUB`,
  // because the /keystatic UI is a CLIENT bundle and only `NEXT_PUBLIC_` vars reach
  // it at build time. (The old check on `KEYSTATIC_GITHUB_CLIENT_ID` worked on the
  // server but was always `undefined` in the browser, so the deployed editor fell
  // back to `local` and never showed the GitHub sign-in.) Set the flag to `true`
  // on the production deploy → github mode (commits to the repo); leave it unset in
  // CI and local dev → `local` mode, so `next build` never evaluates github storage
  // without the App secrets. The OAuth secrets themselves are read at request time
  // by the route handler from the runtime env.
  storage:
    process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB === 'true'
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
        image: codexImage('characters'),
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
        image: codexImage('concepts'),
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
        image: codexImage('factions'),
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
        image: codexImage('places'),
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
        image: codexImage('journal'),
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
        image: codexImage('reading'),
        imageAlt: fields.text({ label: 'Image alt text', validation: { isRequired: false } }),
        // NOTE: the reading sample has NO reveal field by design (ADR-0004) —
        // the Prologue + Chapter One are open bait, published ungated.
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: bodyField,
      },
    }),
  },
  singletons: {
    home: singleton({
      label: 'Homepage',
      path: 'src/content/settings/home',
      format: { data: 'json' },
      schema: {
        coverImage: fields.image({
          label: 'Book cover',
          description: 'Shown on the homepage hero. Recommended 2:3 (e.g. 800×1200).',
          directory: 'public/covers',
          publicPath: '/covers/',
          validation: { isRequired: false },
        }),
        coverAlt: fields.text({
          label: 'Cover alt text',
          description: 'Describes the cover for screen readers — usually the title treatment.',
          validation: { isRequired: false },
        }),
      },
    }),
  },
});
