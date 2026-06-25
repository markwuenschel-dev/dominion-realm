import 'server-only';
import { getCodexEntries } from './content';
import { getJournalPosts } from './journal';
import { getReadingEntries } from './reading';
import { codexUrl } from './codex';
import { journalUrl } from './journal';
import { readingUrl } from './reading';
import { isUngated } from './reveal';

/**
 * Build-time search corpus (replaces Pagefind — ADR-0010). Each document is
 * spoiler-safe: title + summary for every non-draft entry, plus the body ONLY
 * when the entry is ungated (codex/journal `reveal === 'teaser'`, or any reading
 * piece). Above-teaser bodies never enter the index, preserving the Pagefind-era
 * `data-pagefind-ignore` guarantee that spoilers stay out of search.
 */

export interface SearchDoc {
  id: string;
  url: string;
  title: string;
  kind: string;
  summary: string;
  /** Present only for ungated entries. */
  body?: string;
}

export function getSearchDocuments(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const e of getCodexEntries()) {
    docs.push({
      id: `${e.collection}/${e.id}`,
      url: codexUrl(e.collection, e.id),
      title: e.data.name,
      kind: e.collection,
      summary: e.data.summary,
      body: isUngated(e.data.reveal) ? e.body : undefined,
    });
  }

  for (const p of getJournalPosts()) {
    docs.push({
      id: `journal/${p.id}`,
      url: journalUrl(p.id),
      title: p.data.title,
      kind: 'journal',
      summary: p.data.summary,
      body: isUngated(p.data.reveal) ? p.body : undefined,
    });
  }

  for (const r of getReadingEntries()) {
    docs.push({
      id: `reading/${r.id}`,
      url: readingUrl(r.id),
      title: r.data.title,
      kind: 'reading',
      summary: r.data.summary,
      body: r.body,
    });
  }

  return docs;
}
