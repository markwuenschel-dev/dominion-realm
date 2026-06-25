import {
  CODEX_COLLECTIONS,
  getCodexEntries,
  getCodexEntry,
  type CodexCollection,
  type CodexEntry,
} from './content';

/**
 * Helpers for the World Codex (ADR-0002). The four codex collections share a
 * base schema (see content.ts); this module centralizes their labels, loading,
 * URL shape, and cross-link resolution so the index and entry pages stay thin.
 */

export { CODEX_COLLECTIONS, getCodexEntries, getCodexEntry };
export type { CodexCollection, CodexEntry };

export const COLLECTION_LABELS: Record<CodexCollection, string> = {
  characters: 'Characters',
  concepts: 'Concepts & Power',
  factions: 'Factions & Threats',
  places: 'Places',
};

/** Section ordering for the index browse view. */
export const COLLECTION_ORDER = CODEX_COLLECTIONS;

const KIND_LABELS: Record<string, string> = {
  'magic-system': 'Magic System',
  artifact: 'Artifact',
  phenomenon: 'Phenomenon',
  term: 'Concept',
  faction: 'Faction',
  people: 'People',
  threat: 'Threat',
};

/** Canonical URL for a codex entry (root-served — no base path on Railway). */
export function codexUrl(collection: string, id: string): string {
  return `/codex/${collection}/${id}`;
}

/** Short kicker line for a card / header (role, kind, or region). */
export function entryKicker(entry: CodexEntry): string {
  const data = entry.data;
  if ('role' in data && data.role) return data.role;
  if ('kind' in data && data.kind)
    return KIND_LABELS[data.kind] ?? COLLECTION_LABELS[entry.collection];
  if ('region' in data && data.region) return data.region;
  return COLLECTION_LABELS[entry.collection];
}

export interface ResolvedLink {
  url: string;
  name: string;
  label?: string;
}

/** A single declared relationship from an entry's frontmatter. */
export type Relationship = CodexEntry['data']['relationships'][number];

/**
 * Find the codex entry a declared `relationship` points at. Targets are matched
 * by id, optionally constrained to a collection; a dangling link (e.g. a
 * not-yet-written cross-reference) resolves to `undefined` rather than throwing,
 * so the build never breaks on an unresolved tie. Shared by the entry-page
 * link list and the constellation edge graph so both honor the same rule.
 */
export function matchRelationship(
  rel: Relationship,
  candidates: CodexEntry[],
): CodexEntry | undefined {
  return candidates.find(
    (e) => e.id === rel.entry && (!rel.collection || e.collection === rel.collection),
  );
}

/**
 * Resolve an entry's `relationships` to live links. Dangling links are skipped
 * so a not-yet-written cross-reference never breaks the build.
 */
export function resolveRelationships(entry: CodexEntry, all: CodexEntry[]): ResolvedLink[] {
  const links: ResolvedLink[] = [];
  for (const rel of entry.data.relationships) {
    const target = matchRelationship(rel, all);
    if (!target) continue;
    links.push({
      url: codexUrl(target.collection, target.id),
      name: target.data.name,
      label: rel.label,
    });
  }
  return links;
}
