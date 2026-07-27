import { defineType, defineField } from 'sanity';
import { SCENE_BEAT_META } from '../sceneJoins';
import { galleryField } from './mediaImage';

/**
 * Scene art (ADR-0011, CONTEXT.md § Media) — images bound to a *story beat*
 * (a reading chapter or a timeline event) rather than to a Subject. `beat` says
 * which kind of beat, `beatRef` is the slug/id of that chapter or event in git.
 *
 * The `beat` choices are projected from `SCENE_BEAT_META` (the same record the
 * reader and the orphan detector consume), so the author can never be offered a
 * kind the runtime cannot read — the pattern `subject.kind` already follows.
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
        list: SCENE_BEAT_META.map((b) => ({ title: b.title, value: b.value })),
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'beatRef',
      title: 'Chapter / event slug',
      type: 'string',
      description:
        'The beat’s git filename slug — exactly as it appears in the URL. For a ' +
        'reading chapter that is the id in /read/<id> (e.g. "01-chapter-one", ' +
        '"00-prologue"); for a timeline event, its file id (e.g. ' +
        '"01-the-astria-experiment"). It is matched literally: a typo just means ' +
        'the art never shows, so copy it from the URL rather than retyping.',
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
