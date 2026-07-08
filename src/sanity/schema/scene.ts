import { defineType, defineField } from 'sanity';
import { galleryField } from './mediaImage';

/**
 * Scene art (ADR-0011, CONTEXT.md § Media) — images bound to a *story beat*
 * (a reading chapter or a timeline event) rather than to a Subject. `beat` says
 * which kind of beat, `beatRef` is the slug/id of that chapter or event in git.
 */
export const scene = defineType({
  name: 'scene',
  title: 'Scene art',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beat',
      title: 'Belongs to',
      type: 'string',
      options: {
        list: [
          { title: 'Reading chapter', value: 'reading' },
          { title: 'Timeline event', value: 'timeline' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beatRef',
      title: 'Chapter / event slug',
      type: 'string',
      description: 'The slug or id of the chapter or timeline event this art illustrates.',
      validation: (rule) => rule.required(),
    }),
    galleryField('images', 'Images', 'The scene images, in order, each with caption + alt.'),
  ],
  preview: {
    select: { title: 'title', beat: 'beat', beatRef: 'beatRef' },
    prepare({ title, beat, beatRef }) {
      return { title: title || '(untitled scene)', subtitle: `${beat ?? ''} · ${beatRef ?? ''}` };
    },
  },
});
