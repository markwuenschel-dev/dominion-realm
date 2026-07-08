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
  ],
  preview: {
    select: { media: 'cover' },
    prepare({ media }) {
      return { title: 'Site settings', subtitle: 'Homepage cover', media };
    },
  },
});
