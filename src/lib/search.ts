import 'server-only';
import { getCodexEntries } from './content';
import { getJournalPosts } from './journal';
import { getReadingEntries } from './reading';
import { codexUrl } from './codex';
import { journalUrl } from './journal';
import { readingUrl } from './reading';
import { DEFAULT_TIER, isUngated, stripGatedSections } from './reveal';
import type { SearchDoc } from './searchSchema';

// The document shape + index config live in the client-safe schema module so the
// browser <SearchBox> can share them; re-exported here for existing importers.
export type { SearchDoc } from './searchSchema';

/**
 * Build-time search corpus (replaces Pagefind — ADR-0010). Each document is
 * spoiler-safe: title + summary for every non-draft entry, plus the body ONLY
 * when the entry is ungated (codex/journal `reveal === 'teaser'`, or any reading
 * piece). Above-teaser bodies never enter the index, preserving the Pagefind-era
 * `data-pagefind-ignore` guarantee that spoilers stay out of search.
 *
 * A teaser entry can still wrap spoilers in in-body `<RevealGate>` sections, so
 * its body is run through `stripGatedSections` before indexing — the gated prose
 * is dropped and only the ungated teaser text is searchable.
 */

export function getSearchDocuments(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const e of getCodexEntries()) {
    docs.push({
      id: `${e.collection}/${e.id}`,
      url: codexUrl(e.collection, e.id),
      title: e.data.name,
      kind: e.collection,
      summary: e.data.summary,
      reveal: e.data.reveal,
      body: isUngated(e.data.reveal) ? stripGatedSections(e.body) : undefined,
    });
  }

  for (const p of getJournalPosts()) {
    docs.push({
      id: `journal/${p.id}`,
      url: journalUrl(p.id),
      title: p.data.title,
      kind: 'journal',
      summary: p.data.summary,
      reveal: p.data.reveal,
      body: isUngated(p.data.reveal) ? stripGatedSections(p.body) : undefined,
    });
  }

  for (const r of getReadingEntries()) {
    docs.push({
      id: `reading/${r.id}`,
      url: readingUrl(r.id),
      title: r.data.title,
      kind: 'reading',
      summary: r.data.summary,
      reveal: DEFAULT_TIER,
      body: r.body,
    });
  }

  return docs;
}
