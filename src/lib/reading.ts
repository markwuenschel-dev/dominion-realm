import { getReadingEntries, getReadingEntry, type ReadingEntry } from './content';

/**
 * Helpers for the Reading Sample (Track A): the open Prologue + Chapter One web
 * reader. Unlike the codex, this collection is ungated — no reveal tier — so the
 * loader only draft-filters (in prod) and sorts by `order`.
 */

export { getReadingEntries, getReadingEntry };
export type { ReadingEntry };

const KIND_LABELS: Record<ReadingEntry['data']['kind'], string> = {
  prologue: 'Prologue',
  chapter: 'Chapter',
};

/** Canonical URL for a reading piece (root-served). */
export function readingUrl(id: string): string {
  return `/read/${id}`;
}

/**
 * URL for one scene-page of a chapter. Part 1 is the canonical chapter URL
 * (`/read/<id>`); later parts hang off it (`/read/<id>/2`), so single-scene
 * pieces and existing links keep their clean address.
 */
export function readingSceneUrl(id: string, part: number): string {
  return part <= 1 ? `/read/${id}` : `/read/${id}/${part}`;
}

/**
 * Split a chapter body into scenes at markdown thematic breaks (a line of only
 * `---`, `***`, or `___`). Trims blank segments; always returns at least one
 * scene, so a break-free piece (the Prologue) paginates to a single page.
 */
export function splitScenes(body: string): string[] {
  const parts = body
    .split(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [body.trim()];
}

/** How many scenes a piece splits into (>= 1). */
export function sceneCount(entry: ReadingEntry): number {
  return splitScenes(entry.body).length;
}

/** Below this whole-body word count a piece stays one page even if it has scene
 *  breaks — so a short Prologue isn't chopped into tiny pages, only a long
 *  chapter is (Chapter 1 is ~9.5k words; the Prologue ~750). */
export const PAGINATE_WORD_THRESHOLD = 2500;

/** Whether a piece is long enough AND multi-scene to read as paged scenes. */
export function shouldPaginate(entry: ReadingEntry): boolean {
  if (sceneCount(entry) < 2) return false;
  return entry.body.trim().split(/\s+/).filter(Boolean).length >= PAGINATE_WORD_THRESHOLD;
}

/**
 * Parse a `/read/<id>/[part]` segment into a valid **later-scene** index
 * (part ≥ 2), or `null` to 404. Part 1 lives at the canonical `/read/<id>`
 * route. This is the HTTP ownership of scene-part validity — reject, don't clamp.
 */
export function parseLaterScenePart(raw: string, count: number): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2 || n > count) return null;
  return n;
}

/** Short kicker line for a card / header, e.g. "Prologue" or "Chapter". */
export function readingKicker(entry: ReadingEntry): string {
  return KIND_LABELS[entry.data.kind];
}

/**
 * Estimated reading time in whole minutes for a piece of prose, at ~230 wpm
 * (a common adult reading pace). Counts whitespace-separated tokens on the raw
 * MDX body — close enough for a "~N min" cue — and never returns less than 1.
 */
export function readingMinutes(body: string, wpm = 230): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export interface ReadingNeighbors {
  prev?: ReadingEntry;
  next?: ReadingEntry;
}

/** Resolve previous/next pieces around an entry within an already-sorted list. */
export function getNeighbors(entries: ReadingEntry[], id: string): ReadingNeighbors {
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return {};
  return {
    prev: index > 0 ? entries[index - 1] : undefined,
    next: index < entries.length - 1 ? entries[index + 1] : undefined,
  };
}
