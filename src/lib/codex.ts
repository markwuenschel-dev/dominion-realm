import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Helpers for the World Codex (PRD Phase 2). The four codex collections share
 * a base schema (see content.config.ts); this module centralizes their labels,
 * loading, URL shape, and cross-link resolution so the index and entry pages
 * stay thin.
 */

export const CODEX_COLLECTIONS = ['characters', 'concepts', 'factions', 'places'] as const;
export type CodexCollection = (typeof CODEX_COLLECTIONS)[number];
export type CodexEntry = CollectionEntry<CodexCollection>;

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

/** All codex entries across the four collections, draft-filtered in prod. */
export async function getAllCodexEntries(): Promise<CodexEntry[]> {
  const groups = await Promise.all(CODEX_COLLECTIONS.map((c) => getCollection(c)));
  const all = groups.flat();
  const visible = import.meta.env.PROD ? all.filter((e) => !e.data.draft) : all;
  return visible.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/** Canonical URL for a codex entry, base-path aware. */
export function codexUrl(base: string, collection: string, id: string): string {
  return `${base}codex/${collection}/${id}`;
}

/** Short kicker line for a card / header (role, kind, or region). */
export function entryKicker(entry: CodexEntry): string {
  const data = entry.data;
  if ('role' in data && data.role) return data.role;
  if ('kind' in data && data.kind) return KIND_LABELS[data.kind] ?? COLLECTION_LABELS[entry.collection];
  if ('region' in data && data.region) return data.region;
  return COLLECTION_LABELS[entry.collection];
}

export interface ResolvedLink {
  url: string;
  name: string;
  label?: string;
}

/**
 * Resolve an entry's `relationships` to live links. Targets are matched by id
 * (optionally constrained to a collection); dangling links are skipped so a
 * not-yet-written cross-reference never breaks the build.
 */
export function resolveRelationships(
  base: string,
  entry: CodexEntry,
  all: CodexEntry[],
): ResolvedLink[] {
  const links: ResolvedLink[] = [];
  for (const rel of entry.data.relationships) {
    const target = all.find(
      (e) => e.id === rel.entry && (!rel.collection || e.collection === rel.collection),
    );
    if (!target) continue;
    links.push({
      url: codexUrl(base, target.collection, target.id),
      name: target.data.name,
      label: rel.label,
    });
  }
  return links;
}
