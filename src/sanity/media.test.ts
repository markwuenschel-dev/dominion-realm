import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The media read seam (ADR-0011, Phase 3). We assert the externally observable
 * contract: what the readers return for a given Sanity payload, and that a
 * missing Subject/asset resolves to null/absent so the call site can fall back to
 * the git image (Sanity → git → placeholder). Sanity itself is mocked.
 *
 * Each reader is wrapped in React `cache()`, which memoizes for the lifetime of
 * the module — so we `resetModules()` and re-import per test to get a fresh cache
 * and avoid one test's result leaking into the next.
 */
const fetch = vi.fn<(query: string, params?: unknown, opts?: unknown) => Promise<unknown>>();
vi.mock('./client', () => ({ sanityClient: { fetch } }));

async function loadMedia() {
  vi.resetModules();
  return import('./media');
}

// A raw Sanity image field as GROQ returns it (asset ref encodes WxH).
const img = (alt?: string, caption?: string) => ({
  _type: 'image',
  asset: { _ref: 'image-abc123-800x1000-jpg', _type: 'reference' },
  ...(alt ? { alt } : {}),
  ...(caption ? { caption } : {}),
});

beforeEach(() => {
  fetch.mockReset();
});

describe('subjectKey / subjectKindFor', () => {
  it('maps each codex collection to its Subject kind', async () => {
    const { subjectKey, subjectKindFor } = await loadMedia();
    expect(subjectKey('characters', 'marcus')).toBe('character:marcus');
    expect(subjectKey('places', 'eriadne')).toBe('place:eriadne');
    expect(subjectKindFor('factions')).toBe('faction');
    expect(subjectKindFor('concepts')).toBe('concept');
  });
});

describe('getSubjectPrimaryMap', () => {
  it('keys resolved primaries by kind:slug and carries alt', async () => {
    fetch.mockResolvedValue([
      { kind: 'character', slug: 'marcus', primary: img('Marcus Vye') },
      { kind: 'place', slug: 'eriadne', primary: img() },
    ]);
    const { getSubjectPrimaryMap } = await loadMedia();
    const map = await getSubjectPrimaryMap();

    expect(map.get('character:marcus')?.alt).toBe('Marcus Vye');
    expect(map.get('place:eriadne')?.alt).toBe('');
    expect(map.get('character:marcus')?.source).toBeTruthy();
    expect(map.size).toBe(2);
  });

  it('skips rows missing an asset or slug (degrades to git fallback)', async () => {
    fetch.mockResolvedValue([
      { kind: 'character', slug: 'marcus', primary: { _type: 'image' } }, // no asset
      { kind: 'character', slug: null, primary: img() }, // no slug
    ]);
    const { getSubjectPrimaryMap } = await loadMedia();
    expect((await getSubjectPrimaryMap()).size).toBe(0);
  });
});

describe('getSubjectCardMap', () => {
  // The GROQ `coalesce(card, primary)` runs in Sanity; the mock returns the
  // already-coalesced `image`, so here we assert the reader keys and resolves it.
  it('keys the coalesced card/primary image by kind:slug', async () => {
    fetch.mockResolvedValue([
      { kind: 'character', slug: 'marcus', image: img('Marcus — cast card') },
      { kind: 'character', slug: 'serra-hawthorne', image: img('Serra — primary fallback') },
    ]);
    const { getSubjectCardMap } = await loadMedia();
    const map = await getSubjectCardMap();

    expect(map.get('character:marcus')?.alt).toBe('Marcus — cast card');
    expect(map.get('character:serra-hawthorne')?.alt).toBe('Serra — primary fallback');
    expect(map.size).toBe(2);
  });

  it('skips rows with neither a card nor primary asset (git fallback)', async () => {
    fetch.mockResolvedValue([
      { kind: 'character', slug: 'marcus', image: { _type: 'image' } }, // no asset
      { kind: 'character', slug: null, image: img() }, // no slug
    ]);
    const { getSubjectCardMap } = await loadMedia();
    expect((await getSubjectCardMap()).size).toBe(0);
  });
});

describe('getSubjectMedia', () => {
  it('resolves primary, gallery (with captions), and type slots', async () => {
    fetch.mockResolvedValue({
      primary: img('Portrait'),
      gallery: [img('One', 'First'), { _type: 'image' }, img('Two')],
      banner: img('Banner'),
      map: null,
      sigil: img('Crest'),
    });
    const { getSubjectMedia } = await loadMedia();
    const media = await getSubjectMedia('faction', 'astria');

    expect(media?.primary?.alt).toBe('Portrait');
    expect(media?.banner?.alt).toBe('Banner');
    expect(media?.sigil?.alt).toBe('Crest');
    expect(media?.map).toBeNull();
    // The assetless middle gallery item is dropped.
    expect(media?.gallery).toHaveLength(2);
    expect(media?.gallery[0]).toMatchObject({ alt: 'One', caption: 'First' });
    expect(media?.gallery[1]).toMatchObject({ alt: 'Two', caption: '' });
  });

  it('returns null when no Subject exists (call site falls back to git)', async () => {
    fetch.mockResolvedValue(null);
    const { getSubjectMedia } = await loadMedia();
    expect(await getSubjectMedia('character', 'nobody')).toBeNull();
  });
});

describe('getSceneMedia', () => {
  it('resolves a beat’s ordered images with captions, dropping assetless ones', async () => {
    fetch.mockResolvedValue({
      images: [img('Hero', 'The storm wakes'), { _type: 'image' }, img('Second')],
    });
    const { getSceneMedia } = await loadMedia();
    const scene = await getSceneMedia('reading', '01-chapter-one');

    expect(scene?.images).toHaveLength(2);
    expect(scene?.images[0]).toMatchObject({ alt: 'Hero', caption: 'The storm wakes' });
    expect(scene?.images[1]).toMatchObject({ alt: 'Second', caption: '' });
    // The reader filters on both beat and beatRef so beats can't claim each other's art.
    const [, params] = fetch.mock.calls[0];
    expect(params).toEqual({ beat: 'reading', beatRef: '01-chapter-one' });
  });

  it('returns null when no Scene matches (call site falls back to the git hero)', async () => {
    fetch.mockResolvedValue(null);
    const { getSceneMedia } = await loadMedia();
    expect(await getSceneMedia('reading', 'no-such-chapter')).toBeNull();
  });

  it('returns null when a Scene exists but has no usable images', async () => {
    fetch.mockResolvedValue({ images: [{ _type: 'image' }, null] });
    const { getSceneMedia } = await loadMedia();
    expect(await getSceneMedia('timeline', '01-the-astria-experiment')).toBeNull();
  });
});

describe('credit + licence privacy', () => {
  // A fully-loaded raw image: public credit/creditUrl AND a private licence note.
  const rich = (over: Record<string, unknown> = {}) => ({
    _type: 'image',
    asset: { _ref: 'image-abc123-800x1000-jpg', _type: 'reference' },
    hotspot: { x: 0.5, y: 0.3 },
    crop: { top: 0, bottom: 0, left: 0, right: 0 },
    alt: 'Portrait',
    credit: 'Jane Doe',
    creditUrl: 'https://jane.example',
    license: 'CC-BY, bought 2026',
    ...over,
  });

  it('lifts a public credit (name + validated url) off the asset', async () => {
    fetch.mockResolvedValue({ primary: rich(), gallery: [], banner: null, map: null, sigil: null });
    const { getSubjectMedia } = await loadMedia();
    const media = await getSubjectMedia('character', 'jane');
    expect(media?.primary?.credit).toEqual({ name: 'Jane Doe', url: 'https://jane.example' });
  });

  it('never lets the private licence reach the resolved source', async () => {
    fetch.mockResolvedValue({ primary: rich(), gallery: [], banner: null, map: null, sigil: null });
    const { getSubjectMedia } = await loadMedia();
    const src = (await getSubjectMedia('character', 'jane'))?.primary?.source as Record<
      string,
      unknown
    >;
    // source is trimmed to urlFor's needs — focal point kept, licence/credit dropped.
    expect(Object.keys(src)).toEqual(expect.arrayContaining(['asset', 'hotspot', 'crop']));
    expect(src).not.toHaveProperty('license');
    expect(src).not.toHaveProperty('credit');
    expect(src).not.toHaveProperty('alt');
  });

  it('has no credit when the name is blank, even if a creditUrl is set', async () => {
    fetch.mockResolvedValue({
      primary: rich({ credit: '   ', creditUrl: 'https://jane.example' }),
      gallery: [],
      banner: null,
      map: null,
      sigil: null,
    });
    const { getSubjectMedia } = await loadMedia();
    expect((await getSubjectMedia('character', 'jane'))?.primary?.credit).toBeNull();
  });

  it('omits the url when only a credit name is present', async () => {
    fetch.mockResolvedValue({
      primary: rich({ creditUrl: undefined }),
      gallery: [],
      banner: null,
      map: null,
      sigil: null,
    });
    const { getSubjectMedia } = await loadMedia();
    expect((await getSubjectMedia('character', 'jane'))?.primary?.credit).toEqual({
      name: 'Jane Doe',
    });
  });
});

describe('getSiteCover', () => {
  it('returns null when the singleton has no cover', async () => {
    fetch.mockResolvedValue(null);
    const { getSiteCover } = await loadMedia();
    expect(await getSiteCover()).toBeNull();
  });

  it('defaults alt to the site name when the cover has none', async () => {
    fetch.mockResolvedValue(img());
    const { getSiteCover } = await loadMedia();
    expect((await getSiteCover())?.alt).toBe('The Dominion Realm');
  });
});

describe('getRealmMap', () => {
  it('returns null when the singleton has no realm map (falls back to the diagram)', async () => {
    fetch.mockResolvedValue(null);
    const { getRealmMap } = await loadMedia();
    expect(await getRealmMap()).toBeNull();
  });

  it('resolves the uploaded map image and its alt', async () => {
    fetch.mockResolvedValue(img('The Realm, hand-drawn'));
    const { getRealmMap } = await loadMedia();
    const map = await getRealmMap();
    expect(map?.alt).toBe('The Realm, hand-drawn');
    expect(map?.source).toBeTruthy();
  });
});
