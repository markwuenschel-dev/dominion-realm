import {
  CODEX_COLLECTIONS,
  getCodexEntries,
  getCodexEntry,
  type CodexCollection,
  type CodexEntry,
} from './content';
import { hasCoords, type PlaceMarker } from './map';
import { eyeStageLabel } from './eyeStages';
import { DEFAULT_TIER, maxTier, type RevealTier } from './reveal';

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

/** Canonical URL for a codex entry (root-served — no base path). */
export function codexUrl(collection: string, id: string): string {
  return `/codex/${collection}/${id}`;
}

/** Short kicker line for a card / header (role, kind, or region). */
export function entryKicker(entry: CodexEntry): string {
  // Discriminates on `collection`, so each branch sees its own data shape. A new
  // codex collection makes this stop compiling until it's handled here.
  switch (entry.collection) {
    case 'characters':
      return entry.data.role || COLLECTION_LABELS.characters;
    case 'concepts':
    case 'factions':
      return KIND_LABELS[entry.data.kind] ?? COLLECTION_LABELS[entry.collection];
    case 'places':
      return entry.data.region || COLLECTION_LABELS.places;
  }
}

/**
 * Build interactive map markers from the `places` collection: every place that
 * carries `mapX`/`mapY` coordinates becomes a marker, so authoring a place is
 * all it takes to put it on /map. Tier-gating is applied later, client-side, by
 * `selectVisibleMarkers` (lib/map.ts) so it can respond to the reveal toggle.
 */
export function getPlaceMarkers(): PlaceMarker[] {
  return getCodexEntries().flatMap((e) => {
    if (e.collection !== 'places') return [];
    // e.data is now narrowed to the places schema — no cast needed.
    const { mapX, mapY, region } = e.data;
    if (mapX == null || mapY == null || !hasCoords({ x: mapX, y: mapY })) return [];
    return [
      {
        id: e.id,
        name: e.data.name,
        kind: region ?? COLLECTION_LABELS.places,
        summary: e.data.summary,
        href: codexUrl('places', e.id),
        reveal: e.data.reveal,
        x: mapX,
        y: mapY,
      },
    ];
  });
}

/** A labelled fact for the entry-page dossier, as pure data — the page maps it
 *  to markup (plain text, a pill, a link-pill, or a status badge). */
export interface DossierField {
  term: string;
  value: string;
  /** Render the value as a pill; when `href` is also set the pill is a link. */
  chip?: boolean;
  href?: string;
  /** When set, render the value as a status badge keyed to this state. */
  badge?: 'alive' | 'dead';
  /** Reveal tier for this individual fact; the entry page gates each row by it.
   *  Omitted → teaser (always shown). Lets a spoilery fact (e.g. a "Deceased"
   *  status) seal while the rest of the dossier stays visible. */
  reveal?: RevealTier;
}

const STATUS_LABELS: Record<'alive' | 'dead', string> = {
  alive: 'Alive',
  dead: 'Deceased',
};

/**
 * Facts a codex entry declares in frontmatter but the body doesn't repeat —
 * surfaced under the summary as a small dossier. Narrows on `collection` so each
 * branch reads its own fields; a field is emitted only when present (an `unknown`
 * status and empty aliases produce nothing), so an entry with no dossier-worthy
 * data yields an empty list and the page renders no block.
 */
export function dossierFields(entry: CodexEntry): DossierField[] {
  const fields: DossierField[] = [];
  switch (entry.collection) {
    case 'characters': {
      const { status, aliases, eyeStage } = entry.data;
      if (status === 'alive' || status === 'dead') {
        // A death is a spoiler — seal a "Deceased" status at deep, but leave
        // "Alive" (and every other fact) at teaser.
        fields.push({
          term: 'Status',
          value: STATUS_LABELS[status],
          badge: status,
          reveal: status === 'dead' ? 'deep' : DEFAULT_TIER,
        });
      }
      if (aliases.length > 0) {
        fields.push({ term: 'Also known as', value: aliases.join(' · ') });
      }
      if (eyeStage != null) {
        fields.push({
          term: 'Eye stage',
          value: eyeStageLabel(eyeStage),
          chip: true,
          href: '/eyes',
        });
      }
      break;
    }
    case 'concepts': {
      const { stage } = entry.data;
      if (stage != null) fields.push({ term: 'Stage', value: eyeStageLabel(stage), chip: true });
      break;
    }
    case 'places': {
      const { timeline } = entry.data;
      if (timeline) fields.push({ term: 'Timeline', value: timeline });
      break;
    }
    case 'factions':
      break;
  }
  return fields;
}

export interface ResolvedLink {
  url: string;
  name: string;
  label?: string;
  /** Effective tier of the link — the higher of the relationship's own `reveal`
   *  and the target entry's tier — so gating a spoilery connection is automatic. */
  reveal: RevealTier;
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
 * Build a live link from a declared relationship and the entry it resolves to.
 * The effective reveal tier is the higher of the link's own tier and the
 * target's — a link pointing at a `deep` entry is itself a `deep` fact. The one
 * place a (relationship, target) pair becomes a `ResolvedLink`, shared by the
 * codex entry-page list and the timeline beat's cross-link so both build the
 * link and merge the tier identically.
 */
export function resolveLink(rel: Relationship, target: CodexEntry): ResolvedLink {
  return {
    url: codexUrl(target.collection, target.id),
    name: target.data.name,
    label: rel.label,
    reveal: maxTier(rel.reveal ?? DEFAULT_TIER, target.data.reveal),
  };
}

/**
 * Resolve an entry's `relationships` to live links. Dangling links are skipped
 * so a not-yet-written cross-reference never breaks the build.
 */
export function resolveRelationships(entry: CodexEntry, all: CodexEntry[]): ResolvedLink[] {
  const links: ResolvedLink[] = [];
  for (const rel of entry.data.relationships) {
    const target = matchRelationship(rel, all);
    if (target) links.push(resolveLink(rel, target));
  }
  return links;
}
