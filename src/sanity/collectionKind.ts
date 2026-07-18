import type { CodexCollection } from '@/lib/contentCore';
import type { SubjectKind } from './slotMap';

/**
 * Map a git codex collection to its Sanity `Subject.kind`. The join is by
 * collection, NOT the git `kind:` taxonomy (which is finer-grained content).
 * Shared by `media.ts` (site reads) and `scripts/sanity-migrate.ts` (writes).
 */
export const COLLECTION_KIND: Record<CodexCollection, SubjectKind> = {
  characters: 'character',
  concepts: 'concept',
  factions: 'faction',
  places: 'place',
};

export function subjectKindFor(collection: CodexCollection): SubjectKind {
  return COLLECTION_KIND[collection];
}
