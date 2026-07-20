import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * RSS spoiler contract (audit CAND-02, ADR-0004). The public /rss.xml feed must
 * carry only ungated (Teaser) journal posts; a sealed post's title/summary is a
 * spoiler surface and must never reach the feed. `getJournalPosts` is mocked so
 * the assertion is fixture-driven, not dependent on live content (which happens
 * to be all-teaser today).
 */
const { getJournalPosts } = vi.hoisted(() => ({ getJournalPosts: vi.fn<() => unknown[]>() }));
vi.mock('@/lib/journal', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/journal')>()),
  getJournalPosts,
}));

import { GET } from './route';

const post = (id: string, reveal: string, title: string, summary: string) => ({
  id,
  collection: 'journal',
  body: '',
  data: {
    title,
    summary,
    pubDate: new Date('2026-01-01T00:00:00Z'),
    category: 'field-notes',
    reveal,
  },
});

afterEach(() => getJournalPosts.mockReset());

describe('GET /rss.xml (CAND-02)', () => {
  it('includes teaser posts and excludes sealed ones', async () => {
    getJournalPosts.mockReturnValue([
      post('open-note', 'teaser', 'An Open Note', 'A spoiler-safe teaser summary.'),
      post('sealed-twist', 'deep', 'The Villain Is Her Father', 'He dies in chapter twenty.'),
    ]);

    const xml = await (await GET()).text();

    expect(xml).toContain('An Open Note');
    expect(xml).toContain('A spoiler-safe teaser summary.');
    // No sealed title or summary substring may appear anywhere in the feed.
    expect(xml).not.toContain('The Villain Is Her Father');
    expect(xml).not.toContain('He dies in chapter twenty.');
    expect(xml).not.toContain('sealed-twist');
    // Exactly one <item> emitted (the teaser).
    expect(xml.match(/<item>/g) ?? []).toHaveLength(1);
  });

  it('emits an empty item list when every post is sealed', async () => {
    getJournalPosts.mockReturnValue([
      post('a', 'reader', 'Sealed A', 'nope'),
      post('b', 'beyond', 'Sealed B', 'nope'),
    ]);

    const xml = await (await GET()).text();
    expect(xml).not.toContain('<item>');
    expect(xml).toContain('<channel>'); // still a valid, empty feed
  });
});
