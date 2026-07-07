import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  resolveImage,
  getCodexEntries,
  getJournalEntries,
  getReadingEntries,
  CODEX_COLLECTIONS,
} from './content';

/**
 * Content-engine tests. These run against the REAL `src/content/` corpus, so
 * they double as the build-schema gate asserted directly (a malformed entry
 * makes the Zod loader throw) plus coverage of the sorting, image-rewrite, and
 * draft-filtering behavior the pages rely on.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loaders parse the real corpus', () => {
  it('loads every codex/journal/reading entry without a schema error', () => {
    expect(() => getCodexEntries()).not.toThrow();
    expect(() => getJournalEntries()).not.toThrow();
    expect(() => getReadingEntries()).not.toThrow();
    expect(getCodexEntries().length).toBeGreaterThan(0);
    expect(getReadingEntries().length).toBeGreaterThan(0);
  });

  it('only emits the four known codex collections', () => {
    const collections = new Set(getCodexEntries().map((e) => e.collection));
    for (const c of collections) {
      expect(CODEX_COLLECTIONS).toContain(c);
    }
  });
});

describe('sorting', () => {
  it('sorts codex entries by name (locale-aware)', () => {
    const names = getCodexEntries().map((e) => e.data.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('sorts reading entries by ascending order', () => {
    const orders = getReadingEntries().map((e) => e.data.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('sorts journal entries newest-first by pubDate', () => {
    const times = getJournalEntries().map((e) => e.data.pubDate.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});

describe('resolveImage', () => {
  it('rewrites a bare filename to its /content-media URL', () => {
    expect(resolveImage('characters', 'marcus.png')).toBe('/content-media/characters/marcus.png');
  });

  it('strips a leading ./ or /', () => {
    expect(resolveImage('factions', './crest.png')).toBe('/content-media/factions/crest.png');
    expect(resolveImage('places', '/map.png')).toBe('/content-media/places/map.png');
  });

  it('keeps only the final path segment (current flat-structure behavior)', () => {
    expect(resolveImage('concepts', 'nested/dir/sigil.png')).toBe(
      '/content-media/concepts/sigil.png',
    );
  });

  it('returns undefined when there is no image', () => {
    expect(resolveImage('characters', undefined)).toBeUndefined();
  });

  it('rewrites real entry images to the /content-media prefix', () => {
    for (const entry of getCodexEntries()) {
      if (entry.data.image) {
        expect(entry.data.image).toMatch(new RegExp(`^/content-media/${entry.collection}/`));
      }
    }
  });
});

describe('draft filtering honors NODE_ENV at call time', () => {
  // Content-agnostic: the corpus may currently have zero draft entries, so we
  // assert the invariant (any dev-visible draft is gone in production) rather
  // than pinning a specific entry.
  it('loads the codex outside production (dev/test)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getCodexEntries().length).toBeGreaterThan(0);
  });

  it('drops every draft entry in production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const devDrafts = getCodexEntries()
      .filter((e) => e.data.draft)
      .map((e) => `${e.collection}/${e.id}`);

    vi.stubEnv('NODE_ENV', 'production');
    const prodIds = new Set(getCodexEntries().map((e) => `${e.collection}/${e.id}`));
    for (const id of devDrafts) expect(prodIds.has(id)).toBe(false);
    // And no surviving entry is flagged draft.
    expect(getCodexEntries().every((e) => !e.data.draft)).toBe(true);
  });
});
