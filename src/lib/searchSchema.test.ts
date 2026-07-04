// ─────────────────────────────────────────────────────────────────────────────
// lib/searchSchema.test.ts
// The index config is a single source of truth shared by the server builder and
// the client SearchBox. `satisfies (keyof SearchDoc)[]` already guarantees the
// field names are valid; these assertions pin the config's internal consistency,
// which the type system alone can't — e.g. dropping a rendered field from
// STORE_FIELDS is a valid keyof array but a runtime "undefined" in the UI.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { SEARCH_FIELDS, STORE_FIELDS, SEARCH_BOOST } from './searchSchema';

describe('search index config', () => {
  it('stores every field the results list renders', () => {
    // <SearchBox> reads url, kind, title, summary off each hit.
    for (const field of ['url', 'kind', 'title', 'summary'] as const) {
      expect(STORE_FIELDS).toContain(field);
    }
  });

  it('only boosts fields that are actually searched', () => {
    for (const field of Object.keys(SEARCH_BOOST)) {
      expect(SEARCH_FIELDS).toContain(field);
    }
  });

  it('has no duplicate field entries', () => {
    expect(new Set(SEARCH_FIELDS).size).toBe(SEARCH_FIELDS.length);
    expect(new Set(STORE_FIELDS).size).toBe(STORE_FIELDS.length);
  });
});
