import { getJournalEntries, getJournalEntry, type JournalEntry } from './content';

/**
 * Helpers for the Author Journal (ADR-0003). One `journal` collection carries
 * two streams, distinguished by its `category` field: in-world "Field Notes"
 * and author-voice "From the Desk". Centralizes stream labels, loading/sorting,
 * and URL shape so the index, entry, and RSS pages stay thin.
 */

export { getJournalEntries, getJournalEntry };
export type { JournalEntry };
export type JournalCategory = JournalEntry['data']['category'];

/** The two streams, in display order (used by the index filter). */
export const JOURNAL_CATEGORIES = ['field-notes', 'from-the-desk'] as const;

export const CATEGORY_LABELS: Record<JournalCategory, string> = {
  'field-notes': 'Field Notes',
  'from-the-desk': 'From the Desk',
};

export const CATEGORY_DESCRIPTIONS: Record<JournalCategory, string> = {
  'field-notes': 'In-world dispatches, written from inside the Realm.',
  'from-the-desk': 'Notes from the author on craft, process, and progress.',
};

/** All journal posts, newest first (loader already draft-filters in prod). */
export function getJournalPosts(): JournalEntry[] {
  return getJournalEntries();
}

/** Canonical URL for a journal post (root-served). */
export function journalUrl(id: string): string {
  return `/journal/${id}`;
}

/**
 * Stable date for kickers (e.g. "29 May 2026"). Formatted in UTC so the output
 * matches the authored ISO `pubDate` regardless of the build machine's timezone.
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
