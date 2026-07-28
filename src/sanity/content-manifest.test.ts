import { describe, expect, it } from 'vitest';
import { getReadingEntries, getTimelineEntries } from '@/lib/contentCore';
import { READING_BEATS, TIMELINE_BEATS } from './content-manifest';

/**
 * Staleness gate for the committed manifest (audit CAND-04). The manifest is
 * generated at predev/prebuild but committed so tsc/CI work without a generator
 * run — which means nothing else notices when a beat is added without
 * regenerating: the Studio coverage panes silently miss the new beat while every
 * pre-build CI check validates the stale file.
 *
 * Both lists are gated. TIMELINE_BEATS previously had no gate at all, so adding a
 * timeline event without regenerating left the Studio pane short and CI green.
 *
 * The expected value is recomputed through the same seam the generator uses
 * (`getReadingEntries`/`getTimelineEntries` with drafts included, ids sorted —
 * see scripts/generate-content-manifest.ts), rather than re-deriving the
 * filename→slug rule here. A third copy of that rule could drift from the
 * generator and make this gate lie in either direction.
 *
 * If this goes red, run: pnpm exec tsx scripts/generate-content-manifest.ts
 */
const KINDS = [
  { label: 'READING_BEATS', committed: READING_BEATS, entries: getReadingEntries },
  { label: 'TIMELINE_BEATS', committed: TIMELINE_BEATS, entries: getTimelineEntries },
] as const;

describe('content-manifest', () => {
  for (const { label, committed, entries } of KINDS) {
    it(`committed ${label} matches the content tree`, () => {
      const fresh = entries('include')
        .map((e) => e.id)
        .sort();

      // Guard against the gate passing on two empty lists: an absent content
      // directory returns [], which would match an empty committed manifest.
      expect(fresh.length).toBeGreaterThan(0);
      expect([...committed]).toEqual(fresh);
    });
  }
});
