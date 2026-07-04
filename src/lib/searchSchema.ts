// ─────────────────────────────────────────────────────────────────────────────
// lib/searchSchema.ts — the search document shape + MiniSearch index config.
//
// Client-safe on purpose: the build-time corpus builder (lib/search.ts, which is
// `server-only`) and the browser <SearchBox> both reference this one module, so
// the field schema has a single owner. Renaming a SearchDoc field now surfaces as
// a type error in the index config instead of a silent runtime miss.
// ─────────────────────────────────────────────────────────────────────────────

import type { SearchResult as MiniSearchHit } from 'minisearch';

export interface SearchDoc {
  id: string;
  url: string;
  title: string;
  kind: string;
  summary: string;
  /** Present only for ungated entries. */
  body?: string;
}

/** Fields MiniSearch tokenizes and searches over. */
export const SEARCH_FIELDS = ['title', 'summary', 'body'] as const satisfies (keyof SearchDoc)[];

/** Fields stored on the index and returned on each hit for rendering. */
export const STORE_FIELDS = [
  'title',
  'summary',
  'url',
  'kind',
] as const satisfies (keyof SearchDoc)[];

/** Relevance boosts applied at search time, keyed by searchable field. */
export const SEARCH_BOOST = { title: 3, summary: 2 } as const satisfies Partial<
  Record<keyof SearchDoc, number>
>;

/**
 * A stored search hit: MiniSearch's own result (id, score, match, …) refined
 * with the STORE_FIELDS of a SearchDoc — projected from the same source, so it
 * can't drift from what the index actually returns. The named fields override
 * MiniSearch's `any` index signature, giving the UI typed hits with no casts.
 */
export type SearchResult = MiniSearchHit & Pick<SearchDoc, (typeof STORE_FIELDS)[number]>;
