import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Helpers for the Reading Sample (Track A): the open Prologue + Chapter One web
 * reader. Unlike the codex, this collection is ungated — there is no reveal tier
 * — so the loading logic only draft-filters (in prod) and sorts by `order`.
 * Centralizing it here keeps the index and reader pages thin.
 */

export type ReadingEntry = CollectionEntry<'reading'>;

const KIND_LABELS: Record<ReadingEntry['data']['kind'], string> = {
  prologue: 'Prologue',
  chapter: 'Chapter',
};

/**
 * Every reading piece in reading order. Drafts are filtered out in production
 * (mirroring the codex) but visible during local development so unfinished
 * chapters can be previewed. Sorted by the explicit `order` key.
 */
export async function getReadingEntries(): Promise<ReadingEntry[]> {
  const all = await getCollection('reading');
  const visible = import.meta.env.PROD ? all.filter((e) => !e.data.draft) : all;
  return visible.sort((a, b) => a.data.order - b.data.order);
}

/** Canonical URL for a reading piece, base-path aware. */
export function readingUrl(base: string, id: string): string {
  return `${base}read/${id}`;
}

/** Short kicker line for a card / header, e.g. "Prologue" or "Chapter One". */
export function readingKicker(entry: ReadingEntry): string {
  return KIND_LABELS[entry.data.kind];
}

export interface ReadingNeighbors {
  prev?: ReadingEntry;
  next?: ReadingEntry;
}

/**
 * Resolve the previous/next pieces around a given entry within an already-sorted
 * list. Used to render chapter navigation; either end may be undefined.
 */
export function getNeighbors(entries: ReadingEntry[], id: string): ReadingNeighbors {
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return {};
  return {
    prev: index > 0 ? entries[index - 1] : undefined,
    next: index < entries.length - 1 ? entries[index + 1] : undefined,
  };
}
