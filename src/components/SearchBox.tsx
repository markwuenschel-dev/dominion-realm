'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import MiniSearch from 'minisearch';
import type { SearchDoc } from '@/lib/search';

/**
 * Client-side codex search over the build-time corpus (ADR-0010). The server
 * passes spoiler-safe `docs` (see lib/search.ts); MiniSearch indexes them in the
 * browser. Replaces Pagefind, which needed static HTML we no longer emit.
 */
export function SearchBox({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState('');

  const mini = useMemo(() => {
    const ms = new MiniSearch<SearchDoc>({
      fields: ['title', 'summary', 'body'],
      storeFields: ['title', 'summary', 'url', 'kind'],
      searchOptions: { boost: { title: 3, summary: 2 }, prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(docs);
    return ms;
  }, [docs]);

  const results = query.trim() ? mini.search(query) : [];

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
              <Link href={r.url as string}>
                <span className="dr-search__kind">{r.kind as string}</span>
                <span className="dr-search__title">{r.title as string}</span>
                <span className="dr-search__summary">{r.summary as string}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
