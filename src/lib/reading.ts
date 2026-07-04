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

/** Short kicker line for a card / header, e.g. "Prologue" or "Chapter". */
export function readingKicker(entry: ReadingEntry): string {
  return KIND_LABELS[entry.data.kind];
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
