/**
 * Detection harness for the Scene art slug join (audit CAND-16, ADR-0014).
 *
 * The `beatRef` join is intentionally unvalidated at runtime: a Scene whose
 * `beatRef` matches no git beat simply renders nothing (graceful miss), and
 * nothing is auto-deleted on a words-side rename. This module does NOT change
 * that — it is the *detector* that tells an author when a graceful miss is
 * unintended: a typo'd or orphaned-by-rename Scene document whose art will
 * silently never show.
 *
 * Pure and dependency-free so the Vitest suite can prove the rule with
 * fixtures, while `scripts/check-scene-joins.ts` runs the same detector
 * against the live dataset (exiting non-zero on any orphan).
 */

/**
 * The kinds of story beat a Scene may bind to — the single source of truth for
 * the `scene.beat` enum. Shared so the runtime reader (`media.ts`), this
 * detector, and their tests all reference one list; the set can no longer drift
 * between a hand-copied GROQ filter and a hand-copied `!== 'reading' && …` guard.
 */
export const SCENE_BEATS = ['reading', 'timeline'] as const;

/** One story-beat kind (`scene.beat`), derived from {@link SCENE_BEATS}. */
export type SceneBeat = (typeof SCENE_BEATS)[number];

/** The join-relevant slice of a Sanity `scene` document. */
export interface SceneJoinDoc {
  _id: string;
  title?: string | null;
  beat?: string | null;
  beatRef?: string | null;
}

/** The git-side beat ids a Scene may bind to, keyed by its `beat` kind — one key
 *  per {@link SCENE_BEATS} member, so a new beat kind can't be added without a
 *  corresponding id set. */
export type BeatSets = Record<SceneBeat, readonly string[]>;

/** One broken join: the Scene doc plus why it can never render. */
export interface OrphanScene {
  doc: SceneJoinDoc;
  reason: 'missing-fields' | 'unknown-beat' | 'unknown-beatRef';
}

/**
 * Find Scene docs whose join can never resolve: missing `beat`/`beatRef`,
 * a `beat` outside the known kinds, or a `beatRef` matching no git beat id.
 * Sanity drafts should be filtered out by the caller's query — an in-progress
 * doc is allowed to be temporarily broken.
 */
export function findOrphanScenes(scenes: readonly SceneJoinDoc[], beats: BeatSets): OrphanScene[] {
  const orphans: OrphanScene[] = [];
  for (const doc of scenes) {
    if (!doc.beat || !doc.beatRef) {
      orphans.push({ doc, reason: 'missing-fields' });
      continue;
    }
    const beat = SCENE_BEATS.find((b) => b === doc.beat);
    if (!beat) {
      orphans.push({ doc, reason: 'unknown-beat' });
      continue;
    }
    if (!beats[beat].includes(doc.beatRef)) {
      orphans.push({ doc, reason: 'unknown-beatRef' });
    }
  }
  return orphans;
}

/** Human-readable one-liner for an orphan, used by the live check script. */
export function describeOrphan({ doc, reason }: OrphanScene): string {
  const { _id: id, title, beat, beatRef } = doc;
  const label = title ? `"${title}"` : id;
  switch (reason) {
    case 'missing-fields':
      return `${label} (${id}) — beat/beatRef not set`;
    case 'unknown-beat':
      return `${label} (${id}) — unknown beat "${beat}"`;
    case 'unknown-beatRef':
      return `${label} (${id}) — beat "${beat}" has no git id "${beatRef}"`;
  }
}
