import { getTimelineEntries, type TimelineEntry, type CodexEntry } from './content';
import { getCodexEntries, matchRelationship, toResolvedLink, type ResolvedLink } from './codex';

/**
 * Helpers for the World Timeline — an in-world chronological spine of story and
 * world beats, reveal-gated like the codex. Ordered by the frontmatter `order`;
 * a beat may cross-link one codex entry via `relatedEntry`, resolved through the
 * same `matchRelationship` seam the constellation and entry pages use (a
 * dangling link resolves to nothing rather than throwing).
 */

export { getTimelineEntries };
export type { TimelineEntry };

/** Resolve a beat's optional `relatedEntry` to a live codex link, or undefined. */
export function resolveTimelineLink(
  entry: TimelineEntry,
  all: CodexEntry[] = getCodexEntries(),
): ResolvedLink | undefined {
  const rel = entry.data.relatedEntry;
  if (!rel) return undefined;
  const target = matchRelationship(rel, all);
  if (!target) return undefined;
  // Projection (incl. the tier-inheritance spoiler rule) lives once in codex.ts.
  return toResolvedLink(rel, target);
}
