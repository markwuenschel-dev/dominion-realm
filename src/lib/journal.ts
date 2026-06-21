import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Helpers for the Author Journal (ADR-0003). One `journal` collection carries
 * two streams, distinguished by its `category` field: in-world "Field Notes"
 * and author-voice "From the Desk". This module centralizes the stream labels,
 * loading/sorting, and URL shape so the index, entry, and RSS pages stay thin.
 */

export type JournalEntry = CollectionEntry<'journal'>;
export type JournalCategory = JournalEntry['data']['category'];

/** The two streams, in display order (used by the index filter). */
export const JOURNAL_CATEGORIES = ['field-notes', 'from-the-desk'] as const;

/** Canonical display names — use this exact casing in UI and prose. */
export const CATEGORY_LABELS: Record<JournalCategory, string> = {
  'field-notes': 'Field Notes',
  'from-the-desk': 'From the Desk',
};

/** One-line description of what each stream is, for the index intro / filter. */
export const CATEGORY_DESCRIPTIONS: Record<JournalCategory, string> = {
  'field-notes': 'In-world dispatches, written from inside the Realm.',
  'from-the-desk': 'Notes from the author on craft, process, and progress.',
};

/**
 * All journal posts, newest first. Drafts are filtered out in production builds
 * only, so they stay visible while drafting locally (mirrors the codex helper).
 */
export async function getJournalPosts(): Promise<JournalEntry[]> {
  const all = await getCollection('journal');
  const visible = import.meta.env.PROD ? all.filter((p) => !p.data.draft) : all;
  return visible.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** Canonical URL for a journal post, base-path aware. */
export function journalUrl(base: string, id: string): string {
  return `${base}journal/${id}`;
}

/**
 * Stable date for kickers (e.g. "29 May 2026"). Formatted in UTC so the output
 * matches the authored ISO `pubDate` regardless of the build machine's timezone
 * (a bare `2026-05-29` parses as UTC midnight, which shifts a day west of GMT).
 */
export function formatJournalDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Kicker line for a card / header: stream label · formatted date. */
export function journalKicker(post: JournalEntry): string {
  return `${CATEGORY_LABELS[post.data.category]} · ${formatJournalDate(post.data.pubDate)}`;
}
