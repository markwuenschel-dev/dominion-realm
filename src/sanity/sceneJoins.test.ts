import { describe, it, expect } from 'vitest';
import { findOrphanScenes, describeOrphan, type SceneJoinDoc } from './sceneJoins';
import { READING_BEATS, TIMELINE_BEATS } from './content-manifest';

/**
 * The slug/beatRef join detection harness (audit CAND-16). Runtime keeps the
 * intentional graceful miss (ADR-0014); these tests prove the *detector*
 * distinguishes a valid join from an unintended orphan, so the live check
 * script (scripts/check-scene-joins.ts) can flag Studio typos and
 * orphaned-by-rename Scenes.
 */

const beats = {
  reading: ['00-prologue', '01-chapter-one'],
  timeline: ['01-the-astria-experiment', '02-waking-in-the-realm'],
};

const doc = (over: Partial<SceneJoinDoc> = {}): SceneJoinDoc => ({
  _id: 'scene-1',
  title: 'The storm wakes',
  beat: 'reading',
  beatRef: '01-chapter-one',
  ...over,
});

describe('findOrphanScenes', () => {
  it('accepts valid reading and timeline joins', () => {
    const scenes = [
      doc(),
      doc({ _id: 'scene-2', beat: 'timeline', beatRef: '01-the-astria-experiment' }),
    ];
    expect(findOrphanScenes(scenes, beats)).toEqual([]);
  });

  it('flags a beatRef that matches no git beat (typo / rename)', () => {
    const scenes = [doc({ beatRef: '01-chapter-1' })];
    const orphans = findOrphanScenes(scenes, beats);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toBe('unknown-beatRef');
  });

  it('does not let a reading Scene claim a timeline id (beat scoping)', () => {
    // The runtime reader filters on beat AND beatRef; the detector must apply
    // the same scoping or a cross-beat typo would pass as valid.
    const scenes = [doc({ beatRef: '01-the-astria-experiment' })];
    expect(findOrphanScenes(scenes, beats)).toHaveLength(1);
  });

  it('flags missing fields and unknown beat kinds', () => {
    const scenes = [
      doc({ _id: 'a', beat: null }),
      doc({ _id: 'b', beatRef: undefined }),
      doc({ _id: 'c', beat: 'codex' }),
    ];
    const reasons = findOrphanScenes(scenes, beats).map((o) => o.reason);
    expect(reasons).toEqual(['missing-fields', 'missing-fields', 'unknown-beat']);
  });

  it('returns empty for an empty dataset', () => {
    expect(findOrphanScenes([], beats)).toEqual([]);
  });

  it('accepts every id in the committed manifest (fixture ↔ manifest sync)', () => {
    const scenes = [
      ...READING_BEATS.map((beatRef, i) => doc({ _id: `r-${i}`, beat: 'reading', beatRef })),
      ...TIMELINE_BEATS.map((beatRef, i) => doc({ _id: `t-${i}`, beat: 'timeline', beatRef })),
    ];
    expect(findOrphanScenes(scenes, { reading: READING_BEATS, timeline: TIMELINE_BEATS })).toEqual(
      [],
    );
  });
});

describe('describeOrphan', () => {
  it('names the doc and the failure in each message', () => {
    const [orphan] = findOrphanScenes([doc({ beatRef: 'nope' })], beats);
    expect(describeOrphan(orphan)).toContain('The storm wakes');
    expect(describeOrphan(orphan)).toContain('nope');
    const [missing] = findOrphanScenes([doc({ title: null, beat: null })], beats);
    expect(describeOrphan(missing)).toContain('scene-1');
    expect(describeOrphan(missing)).toContain('not set');
  });
});
