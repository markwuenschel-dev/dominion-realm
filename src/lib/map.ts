import { isRevealed, TIER_LABELS, type RevealTier } from './reveal';

/**
 * Pure geometry + reveal-gating for the interactive world map (content-depth
 * backlog #4). The /map overlay is data-driven from the `places` codex
 * collection: an author who adds a place with `mapX`/`mapY` coordinates gets a
 * marker for free. This module owns the two pieces of logic worth testing in
 * isolation — coordinate clamping and tier-based marker projection — and stays
 * dependency-free (only the reveal vocabulary) so it remains trivially testable
 * and reusable on both server and client.
 *
 * Coordinates are PERCENTAGES (0–100) of the map figure, not SVG viewBox units,
 * so a marker positions itself with plain CSS `left`/`top` over the artwork and
 * scales with it — no coupling to the decorative SVG's coordinate system.
 */

/** A place marker as projected from a codex `places` entry (pre-gating). */
export interface PlaceMarker {
  /** Slug id of the codex entry (used as a React key; never rendered to DOM). */
  id: string;
  /** Display name — a potential spoiler above the teaser tier. */
  name: string;
  /** Short type/region kicker, e.g. "Ley-line convergence". */
  kind: string;
  /** Spoiler-safe one-line summary for the hover/focus tooltip. */
  summary: string;
  /** Codex URL the marker links to when revealed. */
  href: string;
  /** Minimum reveal tier at which the place may be named on the map. */
  reveal: RevealTier;
  /** Horizontal position, percent of the map figure (0 = left, 100 = right). */
  x: number;
  /** Vertical position, percent of the map figure (0 = top, 100 = bottom). */
  y: number;
}

/** A marker the reader is allowed to see in full — name, link, and all. */
export interface RevealedMarker {
  status: 'revealed';
  id: string;
  name: string;
  kind: string;
  summary: string;
  href: string;
  x: number;
  y: number;
}

/**
 * A marker gated above the reader's level. It carries ONLY position and the
 * tier required — never the name, kind, summary, or href — so a spoiler place
 * name cannot reach the rendered DOM at a lower tier.
 */
export interface SealedMarker {
  status: 'sealed';
  id: string;
  reveal: RevealTier;
  /** Generic, non-spoiler label, e.g. "Sealed · Deep". */
  label: string;
  x: number;
  y: number;
}

export type VisibleMarker = RevealedMarker | SealedMarker;

/** Clamp a raw coordinate into the valid 0–100 percent range (NaN → 0). */
export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Whether a coordinate pair is usable (both finite numbers). */
export function hasCoords(coords: { x?: number | null; y?: number | null }): boolean {
  return Number.isFinite(coords.x as number) && Number.isFinite(coords.y as number);
}

/**
 * Project markers to what a reader at `level` may see. A marker whose `reveal`
 * tier is at or below `level` is returned fully (`revealed`); one above it is
 * collapsed to a `sealed` placeholder that drops the name, kind, summary, and
 * href so no spoiler text survives into the rendered DOM.
 *
 * Like every <RevealGate> in this codebase, the un-projected source data still
 * travels in the client payload (the client must be able to un-seal a marker
 * the instant the reader raises their level, without a refetch) — the same
 * honest limit documented on RevealGate. This guards the visible DOM against
 * accidental spoilers, not view-source.
 */
export function selectVisibleMarkers(markers: PlaceMarker[], level: RevealTier): VisibleMarker[] {
  return markers.map((m) => {
    const x = clampPercent(m.x);
    const y = clampPercent(m.y);
    if (isRevealed(m.reveal, level)) {
      return {
        status: 'revealed',
        id: m.id,
        name: m.name,
        kind: m.kind,
        summary: m.summary,
        href: m.href,
        x,
        y,
      };
    }
    return {
      status: 'sealed',
      id: m.id,
      reveal: m.reveal,
      label: `Sealed · ${TIER_LABELS[m.reveal]}`,
      x,
      y,
    };
  });
}
