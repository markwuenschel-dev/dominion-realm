import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The timeline page's Scene-art wiring (audit CAND-27 + CAND-28).
 *
 * Two guarantees, both exercised through the real render path:
 *   1. Batch, not N+1 — the page issues ONE Sanity read for every timeline
 *      beat's art (grouped by beat-kind), never one query per beat. We mock the
 *      Sanity client and count `fetch` calls.
 *   2. SceneArt shows on a hit and is absent on a miss — a beat with resolved
 *      art renders the `<figure class="scene-art">` plate; a beat whose beatRef
 *      matches no Scene stays text-only (graceful miss, ADR-0014).
 *
 * `getSceneMediaMap` is wrapped in React `cache()`, so we `resetModules()` per
 * test and re-import the page to get a fresh cache. The git-side timeline/codex
 * libs are mocked so the test controls the beat list and reveal tiers.
 */
const fetch = vi.fn<(query: string, params?: unknown, opts?: unknown) => Promise<unknown>>();
vi.mock('@/sanity/client', () => ({ sanityClient: { fetch } }));

/** The slice of a timeline entry the page reads. */
interface FakeEntry {
  id: string;
  data: { title: string; when: string; summary: string; reveal: string };
}

const getTimelineEntries = vi.fn<() => FakeEntry[]>();
vi.mock('@/lib/timeline', () => ({
  getTimelineEntries,
  resolveTimelineLink: () => undefined,
}));
vi.mock('@/lib/codex', () => ({ getCodexEntries: () => [] }));

// A raw Sanity image field as GROQ returns it (asset ref encodes WxH).
const img = (alt?: string) => ({
  _type: 'image',
  asset: { _ref: 'image-abc123-1600x900-jpg', _type: 'reference' },
  ...(alt ? { alt } : {}),
});

// A timeline beat as `getTimelineEntries` yields it. `teaser` is ungated, so its
// body (and any SceneArt) renders with no reveal provider in the tree.
const beat = (id: string, reveal = 'teaser') => ({
  id,
  data: { title: `Beat ${id}`, when: 'The First Age', summary: `Summary ${id}`, reveal },
});

async function renderTimeline() {
  vi.resetModules();
  const mod = await import('./page');
  return render(await mod.default());
}

beforeEach(() => {
  fetch.mockReset();
  localStorage.clear();
  delete document.documentElement.dataset.reveal;
});

describe('TimelinePage scene-media batching (CAND-27)', () => {
  it('issues a single Sanity read for all timeline beats, not one per beat', async () => {
    getTimelineEntries.mockReturnValue([beat('01-a'), beat('02-b'), beat('03-c'), beat('04-d')]);
    fetch.mockResolvedValue([]); // no art for any beat

    await renderTimeline();

    // Four beats → exactly one fetch (the anti-N+1 guarantee). One-per-beat
    // would be four.
    expect(fetch).toHaveBeenCalledTimes(1);
    const [query, params] = fetch.mock.calls[0];
    expect(query).toContain('beatRef in $beatRefs');
    expect(params).toMatchObject({
      beat: 'timeline',
      beatRefs: ['01-a', '02-b', '03-c', '04-d'],
    });
  });

  it('issues no read at all when there are no beats', async () => {
    getTimelineEntries.mockReturnValue([]);
    await renderTimeline();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('TimelinePage SceneArt surface (CAND-28)', () => {
  it('renders SceneArt for a beat with media and omits it for a miss', async () => {
    getTimelineEntries.mockReturnValue([beat('01-hit'), beat('02-miss')]);
    // Only the first beat has a Scene doc with a usable image.
    fetch.mockResolvedValue([{ beatRef: '01-hit', images: [img('The storm wakes')] }]);

    const { container } = await renderTimeline();

    // The hit beat shows its plate…
    expect(screen.getByRole('img', { name: 'The storm wakes' })).toBeInTheDocument();
    // …and it is the ONLY scene-art figure — the miss beat stays text-only.
    expect(container.querySelectorAll('.scene-art')).toHaveLength(1);
    // Both beats' text still renders (teaser is ungated).
    expect(screen.getByText('Summary 01-hit')).toBeInTheDocument();
    expect(screen.getByText('Summary 02-miss')).toBeInTheDocument();
  });

  it('does not render SceneArt for a sealed beat even when art exists', async () => {
    getTimelineEntries.mockReturnValue([beat('01-sealed', 'deep')]);
    fetch.mockResolvedValue([{ beatRef: '01-sealed', images: [img('Hidden plate')] }]);

    const { container } = await renderTimeline();

    // The sealed body (summary + its SceneArt) is absent from the live DOM.
    expect(screen.queryByText('Summary 01-sealed')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.scene-art')).toHaveLength(0);
  });
});
