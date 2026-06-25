import {
  CODEX_COLLECTIONS,
  getCodexEntries,
  getCodexEntry,
  type CodexCollection,
  type CodexEntry,
} from './content';
import { hasCoords, type PlaceMarker } from './map';

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

/**
 * Build interactive map markers from the `places` collection: every place that
 * carries `mapX`/`mapY` coordinates becomes a marker, so authoring a place is
 * all it takes to put it on /map. Tier-gating is applied later, client-side, by
 * `selectVisibleMarkers` (lib/map.ts) so it can respond to the reveal toggle.
 */
export function getPlaceMarkers(): PlaceMarker[] {
  return getCodexEntries()
    .filter((e) => e.collection === 'places')
    .flatMap((e) => {
      const data = e.data as { region?: string; mapX?: number; mapY?: number };
      if (!hasCoords({ x: data.mapX, y: data.mapY })) return [];
      return [
        {
          id: e.id,
          name: e.data.name,
          kind: data.region ?? COLLECTION_LABELS.places,
          summary: e.data.summary,
          href: codexUrl('places', e.id),
          reveal: e.data.reveal,
          x: data.mapX as number,
          y: data.mapY as number,
        },
      ];
    });
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
export function resolveRelationships(entry: CodexEntry, all: CodexEntry[]): ResolvedLink[] {
  const links: ResolvedLink[] = [];
  for (const rel of entry.data.relationships) {
    const target = all.find(
      (e) => e.id === rel.entry && (!rel.collection || e.collection === rel.collection),
    );
    if (!target) continue;
    links.push({
      url: codexUrl(target.collection, target.id),
      name: target.data.name,
      label: rel.label,
    });
  }
  return links;
}
