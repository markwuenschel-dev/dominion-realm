import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  RELATIONSHIP_COLLECTIONS,
  RELATIONSHIP_COLLECTION_OPTIONS,
  RELATIONSHIP_COLLECTION_UNSET,
} from './relationshipCollections';
import { relationshipCollectionSchema } from './content';

/**
 * CAND-01 fitness: every value Keystatic may write for relationship.collection
 * must be accepted by the read-side schema, and the unset sentinel must mean
 * "no constraint" (undefined) — the same contract matchRelationship already
 * honors when the field is omitted.
 */
describe('relationshipCollectionSchema', () => {
  it('accepts every shared CMS option value', () => {
    for (const value of RELATIONSHIP_COLLECTION_OPTIONS) {
      expect(() => relationshipCollectionSchema.parse(value)).not.toThrow();
    }
  });

  it('maps the unset sentinel to undefined (no collection constraint)', () => {
    expect(relationshipCollectionSchema.parse(RELATIONSHIP_COLLECTION_UNSET)).toBeUndefined();
  });

  it('keeps real collection names intact', () => {
    for (const value of RELATIONSHIP_COLLECTIONS) {
      expect(relationshipCollectionSchema.parse(value)).toBe(value);
    }
  });

  it('treats omitted / undefined as no constraint', () => {
    expect(relationshipCollectionSchema.parse(undefined)).toBeUndefined();
  });

  it('rejects an unknown collection name', () => {
    expect(() => relationshipCollectionSchema.parse('dragons')).toThrow();
  });

  it('shared options are exactly unset plus the four collections (no drift)', () => {
    expect(RELATIONSHIP_COLLECTION_OPTIONS).toEqual([
      'unset',
      'characters',
      'concepts',
      'factions',
      'places',
    ]);
  });
});

describe('relationship object with unset collection', () => {
  // Mirrors the inline relationship schema shape so a CMS-default save cannot
  // break the build the way the old enum-only field did.
  const relationship = z.object({
    entry: z.string(),
    collection: relationshipCollectionSchema,
    label: z.string().optional(),
  });

  it('parses a CMS-default relationship (collection: unset)', () => {
    const parsed = relationship.parse({ entry: 'marcus', collection: 'unset' });
    expect(parsed).toEqual({ entry: 'marcus', collection: undefined });
  });
});
