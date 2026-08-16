import { describe, it, expect } from 'vitest';
import {
  parseInline,
  parseBlocks,
  blocksToXhtml,
  runsToXhtml,
  escapeXml,
  buildChapters,
  kindLabel,
  bookWithAuthor,
  BOOK,
  EPUB_HREF,
  PDF_HREF,
} from '../../scripts/lib/sample-doc.mjs';
import { SITE } from './site';

/**
 * Pure generator-core tests. This is the logic shared by the build-time EPUB
 * and PDF generators (scripts/generate-downloads.ts), kept dependency-free so
 * it runs identically on CI's Node and under Vitest.
 */

describe('parseInline', () => {
  it('returns a single plain run for unstyled text', () => {
    expect(parseInline('just words')).toEqual([{ text: 'just words', bold: false, italic: false }]);
  });

  it('parses bold and italic markers', () => {
    expect(parseInline('a **bold** and *soft* end')).toEqual([
      { text: 'a ', bold: false, italic: false },
      { text: 'bold', bold: true, italic: false },
      { text: ' and ', bold: false, italic: false },
      { text: 'soft', bold: false, italic: true },
      { text: ' end', bold: false, italic: false },
    ]);
  });

  it('emits an unmatched asterisk as literal text (never drops prose)', () => {
    const runs = parseInline('a * lonely star');
    expect(runs.map((r) => r.text).join('')).toBe('a * lonely star');
  });

  it('handles a fully italicised paragraph', () => {
    expect(parseInline('*This is not a game.*')).toEqual([
      { text: 'This is not a game.', bold: false, italic: true },
    ]);
  });
});

describe('parseBlocks', () => {
  it('splits paragraphs on blank lines and detects scene breaks', () => {
    const blocks = parseBlocks('First para.\n\n---\n\nSecond **para**.');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'scene-break', 'paragraph']);
  });

  it('collapses soft line breaks inside a paragraph to spaces', () => {
    const blocks = parseBlocks('one\ntwo\nthree');
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    if (block.type !== 'paragraph') throw new Error('expected a paragraph block');
    expect(runsToXhtml(block.runs)).toBe('one two three');
  });

  it('treats *** as a scene break too and ignores empty input', () => {
    expect(parseBlocks('***').map((b) => b.type)).toEqual(['scene-break']);
    expect(parseBlocks('   ')).toEqual([]);
  });
});

describe('escapeXml / blocksToXhtml', () => {
  it('escapes XML-significant characters', () => {
    expect(escapeXml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('renders paragraphs with strong/em and scene breaks as <hr>', () => {
    const xhtml = blocksToXhtml(parseBlocks('plain **b** *i*\n\n---'));
    expect(xhtml).toContain('<strong>b</strong>');
    expect(xhtml).toContain('<em>i</em>');
    expect(xhtml).toContain('<hr class="scene-break" />');
    expect(xhtml.startsWith('<p>')).toBe(true);
  });
});

describe('buildChapters', () => {
  const sources = [
    { id: 'b', title: 'Two', kind: 'chapter', order: 1, summary: 's2', body: 'Body two.' },
    { id: 'a', title: 'One', kind: 'prologue', order: 0, summary: 's1', body: 'Body *one*.' },
  ];

  it('sorts by order (Prologue first) and parses bodies into blocks', () => {
    const chapters = buildChapters(sources);
    expect(chapters.map((c) => c.id)).toEqual(['a', 'b']);
    expect(chapters[0].blocks[0].type).toBe('paragraph');
  });

  it('does not mutate the input array', () => {
    const copy = [...sources];
    buildChapters(sources);
    expect(sources).toEqual(copy);
  });
});

describe('metadata', () => {
  it('labels kinds consistently with the reading helpers', () => {
    expect(kindLabel('prologue')).toBe('Prologue');
    expect(kindLabel('chapter')).toBe('Chapter');
  });

  it('exposes download hrefs under /downloads', () => {
    expect(EPUB_HREF).toMatch(/^\/downloads\/.+\.epub$/);
    expect(PDF_HREF).toMatch(/^\/downloads\/.+\.pdf$/);
  });

  it('bakes SITE.author into EPUB/PDF metadata — one source of truth', () => {
    const baked = bookWithAuthor(SITE.author);
    expect(baked.author).toBe(SITE.author);
    expect(baked.author.trim().length).toBeGreaterThan(0);
    // The book title used to be shipped as a placeholder byline.
    expect(baked.author).not.toBe(BOOK.title);
  });

  it('binds the supplied byline rather than a hardcoded placeholder', () => {
    expect(bookWithAuthor('Ursula K. Le Guin').author).toBe('Ursula K. Le Guin');
    expect(BOOK).not.toHaveProperty('author');
  });
});
