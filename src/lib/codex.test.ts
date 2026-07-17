import { describe, it, expect } from 'vitest';
import {
  matchRelationship,
  resolveRelationships,
  toResolvedLink,
  entryKicker,
  dossierFields,
  type Relationship,
} from './codex';
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

describe('toResolvedLink', () => {
  // The single owner of the relationship→link projection, shared by the codex
  // entry pages and the timeline (audit CAND-15). The tier-inheritance rule —
  // a link's effective tier is the higher of the relationship's own reveal and
  // the target's tier — is a spoiler-safety invariant, pinned here once.
  const deepTarget = {
    ...entry('concepts', 'eyes', 'The Eyes'),
    data: { ...eyes.data, reveal: 'deep' },
  } as CodexEntry;

  it('projects url, name, and label from the target and relationship', () => {
    const link = toResolvedLink({ entry: 'astria', label: 'founder of' }, astria);
    expect(link).toEqual({
      url: '/codex/factions/astria',
      name: 'Astria',
      label: 'founder of',
      reveal: 'teaser',
    });
  });

  it('inherits the target tier when it is higher than the relationship tier', () => {
    const link = toResolvedLink({ entry: 'eyes' }, deepTarget);
    expect(link.reveal).toBe('deep');
  });

  it('keeps the relationship tier when it is higher than the target tier', () => {
    const link = toResolvedLink({ entry: 'astria', reveal: 'beyond' }, astria);
    expect(link.reveal).toBe('beyond');
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

describe('dossierFields', () => {
  // Discriminated union → each collection reads its own dossier fields with no cast.
  // `aliases`/`status` carry Zod defaults ([] / 'unknown') the loader always
  // applies, so the fixture seeds them; `extra` overrides per case.
  const fieldsFor = (collection: CodexEntry['collection'], extra: Record<string, unknown>) =>
    dossierFields({
      collection,
      id: 'x',
      body: '',
      data: {
        name: 'N',
        summary: '',
        reveal: 'teaser',
        relationships: [],
        draft: false,
        aliases: [],
        status: 'unknown',
        ...extra,
      },
    } as CodexEntry);

  it('surfaces a character status as a badge, but hides "unknown"', () => {
    // A death is a spoiler, so the "Deceased" fact carries a deep tier.
    expect(fieldsFor('characters', { status: 'dead' })).toContainEqual({
      term: 'Status',
      value: 'Deceased',
      badge: 'dead',
      reveal: 'deep',
    });
    expect(fieldsFor('characters', { status: 'unknown' })).toHaveLength(0);
  });

  it('leaves an "Alive" status at the teaser tier', () => {
    expect(fieldsFor('characters', { status: 'alive' })).toContainEqual({
      term: 'Status',
      value: 'Alive',
      badge: 'alive',
      reveal: 'teaser',
    });
  });

  it('lists aliases only when present', () => {
    expect(fieldsFor('characters', { aliases: ['Marc', 'Marcus Vye'] })).toContainEqual({
      term: 'Also known as',
      value: 'Marc · Marcus Vye',
    });
    expect(fieldsFor('characters', { aliases: [] })).toHaveLength(0);
  });

  it('renders eyeStage as a chip linking to /eyes', () => {
    expect(fieldsFor('characters', { eyeStage: 1 })).toContainEqual({
      term: 'Eye stage',
      value: 'Stage I · Limbal Shift',
      chip: true,
      href: '/eyes',
    });
  });

  it('renders a concept stage as a chip (no link)', () => {
    expect(fieldsFor('concepts', { stage: 3 })).toEqual([
      { term: 'Stage', value: 'Stage III · Neuro-Optical Overdrive', chip: true },
    ]);
  });

  it('renders a place timeline as plain text, or nothing when absent', () => {
    expect(fieldsFor('places', { timeline: 'Present day of Book One' })).toEqual([
      { term: 'Timeline', value: 'Present day of Book One' },
    ]);
    expect(fieldsFor('places', {})).toHaveLength(0);
  });

  it('produces no dossier for a faction', () => {
    expect(fieldsFor('factions', { kind: 'threat' })).toHaveLength(0);
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
    expect(links).toEqual([
      { url: '/codex/factions/astria', name: 'Astria', label: 'serves', reveal: 'teaser' },
    ]);
  });

  it('gives a link the higher of its own tier and the target entry tier', () => {
    const deepTarget = {
      ...astria,
      data: { ...astria.data, reveal: 'deep' as const },
    } as CodexEntry;
    const source = {
      ...marcus,
      data: { ...marcus.data, relationships: [{ entry: 'astria' }] as Relationship[] },
    } as CodexEntry;
    // Target is deep → the link inherits deep even with no explicit tier.
    expect(resolveRelationships(source, [deepTarget])[0].reveal).toBe('deep');
  });

  it('honors an explicit relationship tier above the target tier', () => {
    const source = {
      ...marcus,
      data: {
        ...marcus.data,
        relationships: [{ entry: 'astria', reveal: 'reader' }] as Relationship[],
      },
    } as CodexEntry;
    // astria fixture is teaser; the explicit reader tier wins.
    expect(resolveRelationships(source, [astria])[0].reveal).toBe('reader');
  });
});
