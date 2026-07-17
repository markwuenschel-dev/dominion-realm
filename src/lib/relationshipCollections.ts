/**
 * Relationship `collection` constraint — shared by Keystatic (write) and the
 * Zod content schema (read). Keystatic offers an honest "(unset)" sentinel for
 * "match by slug across collections"; the engine maps that sentinel to
 * `undefined`, which is exactly how `matchRelationship` treats a missing
 * collection. Keeping both sides on this module is the fitness check for
 * CAND-01: write-side option values cannot drift outside what the read side
 * accepts.
 */
export const RELATIONSHIP_COLLECTIONS = [
  'characters',
  'concepts',
  'factions',
  'places',
] as const;

export type RelationshipCollection = (typeof RELATIONSHIP_COLLECTIONS)[number];

/** Keystatic's "no constraint" sentinel — never a real collection name. */
export const RELATIONSHIP_COLLECTION_UNSET = 'unset' as const;

/** Every value the CMS select may write, including the unset sentinel. */
export const RELATIONSHIP_COLLECTION_OPTIONS = [
  RELATIONSHIP_COLLECTION_UNSET,
  ...RELATIONSHIP_COLLECTIONS,
] as const;

export type RelationshipCollectionOption = (typeof RELATIONSHIP_COLLECTION_OPTIONS)[number];
