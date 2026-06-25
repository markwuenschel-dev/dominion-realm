import type { Metadata } from 'next';
import {
  getJournalPosts,
  journalUrl,
  journalKicker,
  CATEGORY_LABELS,
  JOURNAL_CATEGORIES,
} from '@/lib/journal';
import { JournalChrome } from '@/components/journal/JournalChrome';
import { JournalListClient, type JournalItem } from '@/components/journal/JournalListClient';

export const metadata: Metadata = {
  title: 'The Author Journal',
  description:
    "Dispatches from inside the Realm and notes from the author's desk — two streams from the world of The Dominion Realm.",
};

export default function JournalIndex() {
  const posts = getJournalPosts();
  const items: JournalItem[] = posts.map((p) => ({
    id: p.id,
    href: journalUrl(p.id),
    category: p.data.category,
    kicker: journalKicker(p),
    title: p.data.title,
    summary: p.data.summary,
    image: p.data.image,
    imageAlt: p.data.imageAlt,
  }));
  const filters = [
    { value: 'all', label: 'All' },
    ...JOURNAL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
  ];

  return (
    <JournalChrome>
      <div className="journal-head">
        <span className="journal-head__label">The Author Journal</span>
        <h1 className="journal-head__title">
          Dispatches &amp; the <em>Desk</em>
        </h1>
        <p className="journal-head__intro">
          Two streams from the making of The Dominion Realm. <strong>Field Notes</strong> are
          written from inside the Realm — fragments of what the interface shows, and what it leaves
          out. <strong>From the Desk</strong> collects the author&apos;s notes on craft and process.
          Filter below, or read it all.
        </p>
      </div>
      <JournalListClient items={items} filters={filters} />
    </JournalChrome>
  );
}
