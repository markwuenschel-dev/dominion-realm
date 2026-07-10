import { defineType, defineField } from 'sanity';
import { SUBJECT_KINDS, isSlotVisible } from '../slotMap';
import { imageField, galleryField } from './mediaImage';

/**
 * Subject — any thing in the universe that owns pictures (ADR-0011, CONTEXT.md).
 * One generic document for every kind; the `hidden` callbacks on the type slots
 * are the only kind-specific behaviour, and they're driven by the shared slot
 * map. The `slug` is the join key back to the prose entry in git, set by the
 * sync (Phase 2) — the author normally never touches it.
 */
export const subject = defineType({
  name: 'subject',
  title: 'Subject',
  type: 'document',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: { list: SUBJECT_KINDS.map((k) => ({ title: k.title, value: k.value })) },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'The join key to the prose entry (git). Set automatically by sync — usually leave as-is.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'orphaned',
      title: 'Orphaned — prose deleted',
      type: 'boolean',
      readOnly: true,
      initialValue: false,
      description:
        'Set by sync when the matching prose entry no longer exists. The art is kept — review and delete by hand if you want.',
    }),
    imageField('primary', 'Primary image', {
      description: 'The canonical image — used on the Codex card, portrait, and detail.',
    }),
    imageField('card', 'Cast card (homepage)', {
      description:
        'Optional. A dedicated portrait for the homepage “Dramatis Personae” card, so it can ' +
        'differ from the Codex. Left empty, the homepage falls back to the Primary image.',
      hidden: ({ document }: { document?: { kind?: string } }) =>
        !isSlotVisible(document?.kind, 'card'),
    }),
    galleryField('gallery', 'Gallery', 'Ordered extra images, each with its own caption + alt.'),
    imageField('banner', 'Banner (wide)', {
      description: 'A wide hero crop, distinct from the Primary.',
      hidden: ({ document }: { document?: { kind?: string } }) =>
        !isSlotVisible(document?.kind, 'banner'),
    }),
    imageField('map', 'Map', {
      description: 'A map for this place.',
      hidden: ({ document }: { document?: { kind?: string } }) =>
        !isSlotVisible(document?.kind, 'map'),
    }),
    imageField('sigil', 'Sigil / crest', {
      description: 'A sigil or crest for this faction.',
      hidden: ({ document }: { document?: { kind?: string } }) =>
        !isSlotVisible(document?.kind, 'sigil'),
    }),
  ],
  preview: {
    select: { title: 'title', kind: 'kind', orphaned: 'orphaned', media: 'primary' },
    prepare({ title, kind, orphaned, media }) {
      const label = SUBJECT_KINDS.find((k) => k.value === kind)?.title ?? kind ?? '';
      return {
        title: title || '(untitled)',
        subtitle: orphaned ? `⚠ orphaned · ${label}` : label,
        media,
      };
    },
  },
});
