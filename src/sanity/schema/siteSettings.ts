import { defineType } from 'sanity';
import { imageField } from './mediaImage';

/**
 * Site settings (ADR-0011) — a singleton that folds the homepage book cover into
 * the same media system as everything else, instead of the old one-off in
 * `public/covers/`. Enforced as a single document by the Studio structure.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    imageField('cover', 'Book cover', {
      description: 'Homepage hero cover. Recommended 2:3 (e.g. 800×1200).',
    }),
    imageField('socialImage', 'Default social image', {
      description:
        'Default link-preview (OG) image for general pages, entries with no ' +
        'Primary, and sealed (above-teaser) entries. Recommended 1.91:1 ' +
        '(1200×630). Not the 2:3 book cover.',
    }),
  ],
  preview: {
    select: { media: 'cover' },
    prepare({ media }) {
      return { title: 'Site settings', subtitle: 'Homepage cover', media };
    },
  },
});
