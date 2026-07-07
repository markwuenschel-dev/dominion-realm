'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import MiniSearch from 'minisearch';
import {
  SEARCH_FIELDS,
  STORE_FIELDS,
  SEARCH_BOOST,
  type SearchDoc,
  type SearchResult,
} from '@/lib/searchSchema';
import { isRevealed } from '@/lib/reveal';
import { useReveal } from '@/components/reveal/RevealContext';

/**
 * Client-side codex search over the build-time corpus (ADR-0010). The server
 * passes spoiler-safe `docs` (see lib/search.ts); MiniSearch indexes them in the
 * browser. Replaces Pagefind, which needed static HTML we no longer emit.
 */
export function SearchBox({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState('');
  const { level } = useReveal();

  const mini = useMemo(() => {
    const ms = new MiniSearch<SearchDoc>({
      fields: [...SEARCH_FIELDS],
      storeFields: [...STORE_FIELDS],
      searchOptions: { boost: { ...SEARCH_BOOST }, prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(docs);
    return ms;
  }, [docs]);

  // MiniSearch types hits with an `any` index signature; our SearchResult pins
  // the stored fields to STORE_FIELDS so the render below needs no per-field casts.
  // Hits above the reader's reveal level are dropped so a teaser viewer never
  // sees an above-tier entry's title/summary in results.
  const results: SearchResult[] = query.trim()
    ? (mini.search(query) as SearchResult[]).filter((r) => isRevealed(r.reveal, level))
    : [];

  return (
    <div className="dr-search">
      <input
        type="search"
        className="dr-search__input"
        placeholder="Search the Codex…"
        aria-label="Search the Codex"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <ul className="dr-search__results">
          {results.length === 0 && <li className="dr-search__empty">No matches.</li>}
          {results.slice(0, 12).map((r) => (
            <li key={r.id} className="dr-search__result">
              <Link href={r.url}>
                <span className="dr-search__kind">{r.kind}</span>
                <span className="dr-search__title">{r.title}</span>
                <span className="dr-search__summary">{r.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
