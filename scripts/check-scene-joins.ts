/**
 * Live Scene-art join check (audit CAND-16, ADR-0014).
 *
 * Queries the Sanity dataset for published `scene` documents and diffs their
 * `beat`/`beatRef` against the git content tree (via the shared content
 * engine, drafts included). Exits non-zero when any Scene's join can never
 * resolve — a Studio typo or a words-side rename that orphaned the art.
 *
 * This is a LOCAL/OPS tool, deliberately not part of the default CI gate:
 * runtime keeps the intentional graceful miss (a broken join just renders
 * nothing), and default CI stays network-free. Run it before shipping content
 * renames or when art mysteriously doesn't show:
 *
 *   pnpm exec tsx scripts/check-scene-joins.ts
 *
 * The production dataset is publicly readable — no token required.
 */

import { createClient } from '@sanity/client';
import process from 'node:process';
import { getReadingEntries, getTimelineEntries } from '../src/lib/contentCore';
import { describeOrphan, findOrphanScenes, type SceneJoinDoc } from '../src/sanity/sceneJoins';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'zwq04v8v';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01';

const client = createClient({ projectId, dataset, apiVersion, useCdn: false });

async function main() {
  // Beats straight from disk (not the committed manifest) so the check is
  // always current; drafts included — art may be authored ahead of publish.
  const beats = {
    reading: getReadingEntries('include').map((e) => e.id),
    timeline: getTimelineEntries('include').map((e) => e.id),
  };

  // Published docs only: an in-progress draft is allowed to be broken.
  const scenes = await client.fetch<SceneJoinDoc[]>(
    `*[_type == "scene" && !(_id in path("drafts.**"))]{ _id, title, beat, beatRef }`,
  );

  console.log(
    `[scene-joins] ${scenes.length} published Scene(s) in ${projectId}/${dataset} · ` +
      `${beats.reading.length} reading + ${beats.timeline.length} timeline beat(s) in git`,
  );

  const orphans = findOrphanScenes(scenes, beats);
  if (orphans.length === 0) {
    console.log('[scene-joins] all Scene beatRefs resolve — no orphans.');
    return;
  }

  console.error(`\n[scene-joins] ${orphans.length} orphaned Scene(s) — art that never renders:`);
  for (const orphan of orphans) {
    console.error(`  ✗ ${describeOrphan(orphan)}`);
  }
  console.error(
    '\nFix the beatRef in Studio (copy the id from the beat URL) or rename the git file back.',
  );
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error('[scene-joins] check failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
