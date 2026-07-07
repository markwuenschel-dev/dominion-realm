import { describe, it, expect } from 'vitest';
import { getTimelineEntries, resolveTimelineLink } from './timeline';
import type { CodexEntry, TimelineEntry } from './content';

/**
 * World Timeline helpers. `resolveTimelineLink` reuses the codex
 * `matchRelationship` seam, so a beat's optional cross-link resolves to a live
 * codex URL or nothing (never throws on a dangling link). Ordering is also
 * pinned against the real seed corpus.
 */

const codexEntry = (collection: CodexEntry['collection'], id: string, name: string): CodexEntry =>
  ({
    collection,
    id,
    body: '',
    data: { name, summary: '', reveal: 'teaser', relationships: [], draft: false },
  }) as CodexEntry;

const beat = (relatedEntry?: TimelineEntry['data']['relatedEntry']): TimelineEntry =>
  ({
    collection: 'timeline',
    id: 'x',
    body: '',
    data: { title: 'T', when: 'W', order: 1, summary: '', reveal: 'teaser', relatedEntry },
  }) as unknown as TimelineEntry;

const codex = [
  codexEntry('characters', 'marcus', 'Marcus'),
  codexEntry('factions', 'astria', 'Astria'),
];

describe('resolveTimelineLink', () => {
  it('returns undefined when the beat declares no related entry', () => {
    expect(resolveTimelineLink(beat(undefined), codex)).toBeUndefined();
  });

  it('resolves a related entry to a codex link, carrying the label', () => {
    expect(
      resolveTimelineLink(
        beat({ entry: 'marcus', collection: 'characters', label: 'follows' }),
        codex,
      ),
    ).toEqual({
      url: '/codex/characters/marcus',
      name: 'Marcus',
      label: 'follows',
      reveal: 'teaser',
    });
  });

  it('returns undefined for a dangling related entry rather than throwing', () => {
    expect(resolveTimelineLink(beat({ entry: 'ghost' }), codex)).toBeUndefined();
  });
});

describe('getTimelineEntries (real seed corpus)', () => {
  it('loads the seed beats in ascending order without a schema error', () => {
    const entries = getTimelineEntries();
    expect(entries.length).toBeGreaterThan(0);
    const orders = entries.map((e) => e.data.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
