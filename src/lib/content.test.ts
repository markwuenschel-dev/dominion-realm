import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  resolveImage,
  contentImage,
  getCodexEntries,
  getJournalEntries,
  getReadingEntries,
  CODEX_COLLECTIONS,
} from './content';
// `applyDraftPolicy` is the pure draft filter behind every getter; imported from
// contentCore (no `server-only`) so the fixture tests below can exercise all
// three DraftPolicy branches without touching the real content tree.
import { applyDraftPolicy, parseCollectionFrontmatter, type Entry } from './contentCore';

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

  it('strips a leading ./ on a relative path', () => {
    expect(resolveImage('factions', './crest.png')).toBe('/content-media/factions/crest.png');
  });

  it('passes an absolute path through unchanged (Keystatic writes final URLs)', () => {
    // Keystatic stores the finished public URL, including its per-entry subfolder;
    // it must survive resolveImage verbatim so the asset is found where it lives.
    expect(resolveImage('characters', '/content-media/characters/marcus/Marcus.png')).toBe(
      '/content-media/characters/marcus/Marcus.png',
    );
    expect(resolveImage('places', '/map.png')).toBe('/map.png');
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

describe('contentImage — one seam: URL + disk source + existence', () => {
  it('returns nothing for an absent image', () => {
    expect(contentImage('characters', undefined)).toEqual({
      url: undefined,
      diskPath: undefined,
      exists: false,
    });
  });

  it('maps the URL via resolveImage yet reports a missing file as non-existent', () => {
    const img = contentImage('characters', '/content-media/characters/nope-missing-xyz.png');
    expect(img.url).toBe('/content-media/characters/nope-missing-xyz.png'); // passthrough URL
    expect(img.exists).toBe(false);
    expect(img.diskPath).toBeUndefined();
  });

  it('resolves a real entry image to an existing on-disk source', () => {
    const withImage = getCodexEntries().find((e) => e.data.image);
    // The corpus has entries with images (see the resolveImage test above); guard
    // anyway so the suite never fails on an empty corpus.
    if (withImage?.data.image) {
      const img = contentImage(withImage.collection, withImage.data.image);
      expect(img.url).toBe(withImage.data.image);
      expect(img.exists).toBe(true);
      expect(img.diskPath).toBeDefined();
    }
  });
});

describe('parseCollectionFrontmatter — isolated Zod negatives (no live corpus)', () => {
  // In-memory fixtures only: a bad reveal / missing name / invalid eyeStage
  // must fail here so the schema gate does not depend on next build or on
  // planting a broken file under src/content/.

  const minimalCharacter = {
    name: 'x',
    summary: 'y',
    role: 'z',
    reveal: 'teaser',
  };

  it("rejects a character with reveal: 'spoiler' (not a reveal tier)", () => {
    expect(() =>
      parseCollectionFrontmatter('characters', {
        reveal: 'spoiler',
        name: 'x',
        summary: 'y',
        role: 'z',
      }),
    ).toThrow(/invalid/i);
  });

  it('rejects a character missing name', () => {
    expect(() =>
      parseCollectionFrontmatter('characters', {
        summary: 'y',
        role: 'z',
        reveal: 'teaser',
      }),
    ).toThrow(/invalid/i);
  });

  it('rejects a character with eyeStage: 7 (outside 1–6)', () => {
    expect(() =>
      parseCollectionFrontmatter('characters', {
        eyeStage: 7,
        name: 'x',
        summary: 'y',
        role: 'z',
        reveal: 'teaser',
      }),
    ).toThrow(/too big|invalid/i);
  });

  it('rejects a journal entry with a bad category', () => {
    expect(() =>
      parseCollectionFrontmatter('journal', {
        title: 't',
        summary: 's',
        category: 'blog',
        pubDate: '2026-01-01',
        reveal: 'teaser',
      }),
    ).toThrow(/invalid/i);
  });

  it('parses a valid minimal character (defaults applied)', () => {
    const parsed = parseCollectionFrontmatter('characters', minimalCharacter);
    expect(parsed.name).toBe('x');
    expect(parsed.summary).toBe('y');
    expect(parsed.role).toBe('z');
    expect(parsed.reveal).toBe('teaser');
    expect(parsed.aliases).toEqual([]);
    expect(parsed.relationships).toEqual([]);
    expect(parsed.draft).toBe(false);
    expect(parsed.status).toBe('unknown');
  });
});

describe('applyDraftPolicy — the three DraftPolicy branches (fixture corpus)', () => {
  // A minimal in-memory corpus with BOTH a draft and a non-draft entry, so every
  // assertion below is non-vacuous: it can only pass because the filter treated
  // the two entries differently, and it flips if the branch under test inverts.
  function makeCorpus(): Entry<'reading'>[] {
    const entry = (id: string, draft: boolean): Entry<'reading'> => ({
      collection: 'reading',
      id,
      data: { title: id, kind: 'chapter', order: 1, summary: 's', draft },
      body: '',
    });
    return [entry('published', false), entry('wip-draft', true)];
  }

  const ids = (entries: Entry<'reading'>[]) => entries.map((e) => e.id).sort();

  it("'exclude' drops the draft even outside production (policy, not env, does the drop)", () => {
    // Dev context: the `env` branch would KEEP the draft here, so a surviving
    // draft would prove env — not exclude — was responsible. It does not survive.
    vi.stubEnv('NODE_ENV', 'development');
    const kept = applyDraftPolicy(makeCorpus(), 'exclude');
    expect(ids(kept)).toEqual(['published']);
    expect(kept.some((e) => e.data.draft)).toBe(false);
    // Non-vacuous: the corpus contains a draft, so if `exclude` were inverted to
    // keep drafts, `kept` would include 'wip-draft' and both assertions fail.
  });

  it("'include' keeps the draft in production (policy overrides the env gate)", () => {
    // Production context: the `env` branch would DROP the draft here, so keeping
    // it can only mean `include` overrode the env gate.
    vi.stubEnv('NODE_ENV', 'production');
    const kept = applyDraftPolicy(makeCorpus(), 'include');
    expect(ids(kept)).toEqual(['published', 'wip-draft']);
    expect(kept.some((e) => e.data.draft)).toBe(true);
    // Non-vacuous: if `include` were inverted to drop drafts, 'wip-draft' would be
    // gone and both assertions fail — despite the draft being present in input.
  });

  it("'env' keeps drafts outside production", () => {
    vi.stubEnv('NODE_ENV', 'development');
    const kept = applyDraftPolicy(makeCorpus(), 'env');
    expect(ids(kept)).toEqual(['published', 'wip-draft']);
    expect(kept.some((e) => e.data.draft)).toBe(true);
    // Non-vacuous: the input carries a draft; if the dev branch dropped drafts,
    // 'wip-draft' would be missing and this fails.
  });

  it("'env' drops drafts in production but keeps published entries", () => {
    vi.stubEnv('NODE_ENV', 'production');
    const kept = applyDraftPolicy(makeCorpus(), 'env');
    expect(ids(kept)).toEqual(['published']);
    expect(kept.some((e) => e.data.draft)).toBe(false);
    // Non-vacuous both ways: a draft is present (so a no-op prod branch would
    // leak 'wip-draft' and fail) and a non-draft is present (so over-dropping
    // would lose 'published' and also fail).
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
