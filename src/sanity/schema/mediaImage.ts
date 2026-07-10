import { defineField, defineArrayMember } from 'sanity';

/**
 * The metadata every Asset carries (ADR-0011, CONTEXT.md § Media). Spread into
 * each image field's `fields`. Alt text is required *once an image is set* (a
 * custom rule, so an empty optional slot doesn't nag); credit renders publicly,
 * licence is private bookkeeping.
 */
export const imageMetaFields = [
  defineField({
    name: 'alt',
    title: 'Alt text',
    type: 'string',
    description: 'Describe the image for screen readers. Required once an image is set.',
    validation: (rule) =>
      rule.custom((alt, context) => {
        const parent = context.parent as { asset?: unknown } | undefined;
        if (parent?.asset && !alt) return 'Alt text is required when an image is set.';
        return true;
      }),
  }),
  defineField({
    name: 'credit',
    title: 'Artist credit',
    type: 'string',
    description: 'Shown publicly as “Art by —” when present.',
  }),
  defineField({
    name: 'creditUrl',
    title: 'Artist link',
    type: 'url',
    description:
      'Optional. A link for the credit (portfolio, profile). Renders the credit ' +
      'name as an outbound link; ignored unless a credit name is set.',
    validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
  }),
  defineField({
    name: 'license',
    title: 'Source / licence note',
    type: 'string',
    description:
      'Optional, private: where it came from and any licence terms. Never shown publicly.',
  }),
];

/**
 * A single image field (Primary, Banner, Map, Sigil, Cover) with hotspot focal
 * cropping and the shared metadata. `overrides` lets a caller add `hidden`,
 * `description`, etc.
 */
export function imageField(name: string, title: string, overrides: Record<string, unknown> = {}) {
  return defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: imageMetaFields,
    ...overrides,
  });
}

/**
 * An ordered Gallery: image array members, each with the shared metadata plus a
 * caption. Reused by Subject (gallery) and Scene (images).
 */
export function galleryField(name: string, title: string, description: string) {
  return defineField({
    name,
    title,
    type: 'array',
    description,
    options: { layout: 'grid' },
    of: [
      defineArrayMember({
        type: 'image',
        options: { hotspot: true },
        fields: [
          ...imageMetaFields,
          defineField({ name: 'caption', title: 'Caption', type: 'string' }),
        ],
        preview: {
          select: { title: 'caption', subtitle: 'alt', media: 'asset' },
        },
      }),
    ],
  });
}
