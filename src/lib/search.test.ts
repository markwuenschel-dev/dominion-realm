import { describe, it, expect } from 'vitest';
import { getSearchDocuments } from './search';
import { getCodexEntries, getJournalEntries, getReadingEntries } from './content';

/**
 * Search-index tests. The load-bearing guarantee (inherited from the Pagefind
 * era) is that spoilers never enter the corpus: only ungated bodies are
 * indexed. These assertions cross-check the emitted documents against the real
 * entries' reveal tiers so a regression in the gating can't slip through.
 */

const docs = getSearchDocuments();
const byId = new Map(docs.map((d) => [d.id, d]));

describe('spoiler safety', () => {
  it('indexes a codex body only when the entry is teaser-tier', () => {
    for (const entry of getCodexEntries()) {
      const doc = byId.get(`${entry.collection}/${entry.id}`);
      expect(doc, `missing search doc for ${entry.collection}/${entry.id}`).toBeDefined();
      if (entry.data.reveal === 'teaser') {
        expect(typeof doc!.body).toBe('string');
      } else {
        expect(doc!.body).toBeUndefined();
      }
    }
  });

  it('indexes a journal body only when the post is teaser-tier', () => {
    for (const post of getJournalEntries()) {
      const doc = byId.get(`journal/${post.id}`);
      expect(doc).toBeDefined();
      if (post.data.reveal === 'teaser') {
        expect(typeof doc!.body).toBe('string');
      } else {
        expect(doc!.body).toBeUndefined();
      }
    }
  });

  it('always indexes reading bodies (the sample is ungated)', () => {
    for (const entry of getReadingEntries()) {
      const doc = byId.get(`reading/${entry.id}`);
      expect(doc).toBeDefined();
      expect(typeof doc!.body).toBe('string');
    }
  });
});

describe('document shape', () => {
  it('covers every codex, journal, and reading entry exactly once', () => {
    const expected =
      getCodexEntries().length + getJournalEntries().length + getReadingEntries().length;
    expect(docs.length).toBe(expected);
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
  });

  it('emits a root-relative url, a title, and a kind for every doc', () => {
    for (const doc of docs) {
      expect(doc.id).toBeTruthy();
      expect(doc.title).toBeTruthy();
      expect(doc.kind).toBeTruthy();
      expect(doc.url.startsWith('/')).toBe(true);
    }
  });
});
