import { describe, it, expect } from 'vitest';
import { matchRelationship, resolveRelationships, entryKicker, type Relationship } from './codex';
import type { CodexEntry } from './content';

/**
 * Codex relationship-matching tests. `matchRelationship` is the shared seam the
 * entry-page link list and the constellation edge graph both resolve ties
 * through, so its contract (match by id, optionally constrain by collection,
 * never throw on a dangling link) is pinned here against small fixtures.
 */

/** Minimal CodexEntry fixture — only the fields the matcher reads. */
function entry(collection: CodexEntry['collection'], id: string, name = id): CodexEntry {
  return {
    collection,
    id,
    body: '',
    data: { name, summary: '', reveal: 'teaser', relationships: [], draft: false },
  } as CodexEntry;
}

const marcus = entry('characters', 'marcus', 'Marcus');
const astria = entry('factions', 'astria', 'Astria');
const eyes = entry('concepts', 'eyes', 'The Eyes');
// A places entry that collides on id with a character, to exercise the
// collection constraint.
const marcusPlace = entry('places', 'marcus', 'Marcus (a place)');
const all = [marcus, astria, eyes];

describe('matchRelationship', () => {
  it('matches by id when no collection is given', () => {
    const rel: Relationship = { entry: 'astria' };
    expect(matchRelationship(rel, all)).toBe(astria);
  });

  it('matches when the collection constraint agrees', () => {
    const rel: Relationship = { entry: 'eyes', collection: 'concepts' };
    expect(matchRelationship(rel, all)).toBe(eyes);
  });

  it('returns undefined when the collection constraint disagrees', () => {
    const rel: Relationship = { entry: 'astria', collection: 'characters' };
    expect(matchRelationship(rel, all)).toBeUndefined();
  });

  it('returns undefined for a dangling link instead of throwing', () => {
    const rel: Relationship = { entry: 'does-not-exist' };
    expect(() => matchRelationship(rel, all)).not.toThrow();
    expect(matchRelationship(rel, all)).toBeUndefined();
  });

  it('disambiguates id collisions across collections via the constraint', () => {
    const candidates = [marcus, marcusPlace];
    expect(matchRelationship({ entry: 'marcus', collection: 'places' }, candidates)).toBe(
      marcusPlace,
    );
    expect(matchRelationship({ entry: 'marcus', collection: 'characters' }, candidates)).toBe(
      marcus,
    );
  });
});

describe('entryKicker', () => {
  // Discriminated union → each collection reads its own kicker field with no cast.
  const kickerFor = (collection: CodexEntry['collection'], extra: Record<string, unknown>) =>
    entryKicker({
      collection,
      id: 'x',
      body: '',
      data: { name: 'N', summary: '', reveal: 'teaser', relationships: [], draft: false, ...extra },
    } as CodexEntry);

  it('uses a character role verbatim', () => {
    expect(kickerFor('characters', { role: 'Protagonist' })).toBe('Protagonist');
  });

  it('falls back to the collection label when a character has no role', () => {
    expect(kickerFor('characters', { role: '' })).toBe('Characters');
  });

  it('maps a concept/faction kind through KIND_LABELS', () => {
    expect(kickerFor('concepts', { kind: 'magic-system' })).toBe('Magic System');
    expect(kickerFor('factions', { kind: 'threat' })).toBe('Threat');
  });

  it('uses a place region, or the collection label when absent', () => {
    expect(kickerFor('places', { region: 'The Northern Reach' })).toBe('The Northern Reach');
    expect(kickerFor('places', {})).toBe('Places');
  });
});

describe('resolveRelationships', () => {
  it('resolves declared ties to links and skips dangling ones', () => {
    const source = {
      ...marcus,
      data: {
        ...marcus.data,
        relationships: [
          { entry: 'astria', label: 'serves' },
          { entry: 'ghost' }, // dangling — dropped
        ] as Relationship[],
      },
    } as CodexEntry;

    const links = resolveRelationships(source, all);
    expect(links).toEqual([{ url: '/codex/factions/astria', name: 'Astria', label: 'serves' }]);
  });
});
