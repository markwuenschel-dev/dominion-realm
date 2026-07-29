/**
 * Pure, dependency-free core for the reading-sample downloads (Tier 3).
 *
 * This module holds the *logic* that turns the reading-sample MDX bodies
 * (Prologue + Chapter One under src/content/reading) into an ordered chapter
 * model plus the inline/block parsing the EPUB and PDF generators share. It is
 * deliberately plain JavaScript with JSDoc types and imports NOTHING (no
 * `node:fs`, no libs) so that:
 *
 *   - `scripts/generate-downloads.ts` (the build-time generator) can run it via
 *     `tsx` without pulling the pure core into the Next client bundle, and
 *   - `src/lib/downloads.ts` (the React UI) and the Vitest suite can import the
 *     same constants/functions for a single source of truth.
 *
 * The reading sample's prose changes as the author lands real manuscript (the
 * Prologue landed 2026-07-29), so the downloads are generated FROM this content
 * at build time — never hardcoded.
 */

/**
 * Which reading-sample entries are still stand-in prose, keyed by content id
 * (the filename stem under `src/content/reading/`).
 *
 * This started as a comment, became one boolean, and the boolean lied. Chapter
 * One was replaced with the real manuscript on 2026-07-11 (`3b4deca`), but the
 * flag landed on 2026-07-28 covering both entries at once — so a finished
 * 9,583-word chapter reported as stand-in prose, and the board could not say
 * which half was the problem. One entry, one flag.
 *
 * Flip an entry to `false` only in the commit that lands its real prose.
 * `pnpm run launch:check` reads this.
 */
export const PLACEHOLDER_PROSE_BY_ID = {
  '00-prologue': false,
  '01-chapter-one': true,
};

/**
 * Entry ids still running on stand-in prose, in declaration order. An empty
 * array means every entry is the real manuscript.
 */
export const placeholderProseIds = () =>
  Object.entries(PLACEHOLDER_PROSE_BY_ID)
    .filter(([, isPlaceholder]) => isPlaceholder)
    .map(([id]) => id);

/** Public download metadata. The author can rename the files here; the prebuild
 *  generator writes to `public/${DOWNLOAD_DIR}/` and the UI links to the hrefs. */
export const DOWNLOAD_DIR = 'downloads';
export const EPUB_FILENAME = 'the-dominion-realm-sample.epub';
export const PDF_FILENAME = 'the-dominion-realm-sample.pdf';
export const EPUB_HREF = `/${DOWNLOAD_DIR}/${EPUB_FILENAME}`;
export const PDF_HREF = `/${DOWNLOAD_DIR}/${PDF_FILENAME}`;

/** Chapter numbers as the prose spells them. Beyond this, fall back to digits. */
const ORDINAL_WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

/**
 * How the sample names one entry in running prose: `Prologue`, `Chapter One`.
 * @param {{ kind: string, order: number }} entry
 * @returns {string}
 */
export function entryPhrase(entry) {
  if (entry.kind === 'prologue') return 'Prologue';
  return `Chapter ${ORDINAL_WORDS[entry.order] ?? String(entry.order)}`;
}

/**
 * The sample's contents as a human phrase, derived from what is actually on
 * disk — "the Prologue and Chapter One", "Prologue & Chapter One".
 *
 * Page counts, routes, and both downloads already derive from the content
 * files; the sentences describing them did not, so adding a chapter used to
 * mean hunting five hardcoded literals. Ordered by `order`, like everything
 * else that reads this content.
 *
 * @param {{ kind: string, order: number }[]} entries
 * @param {{ article?: boolean, conjunction?: string }} [options]
 * @returns {string}
 */
export function sampleContentsPhrase(entries, options = {}) {
  const { article = true, conjunction = 'and' } = options;
  const sorted = [...entries].sort((a, b) => a.order - b.order);
  const parts = sorted.map(entryPhrase);
  if (parts.length === 0) return '';
  const joined =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} ${conjunction} ${parts[parts.length - 1]}`;
  return article && sorted[0].kind === 'prologue' ? `the ${joined}` : joined;
}

/**
 * Book subtitle for the EPUB/PDF metadata, derived from the chapters actually
 * bundled. These strings are baked into files readers keep, so a stale literal
 * here outlives any deploy.
 * @param {{ kind: string, order: number }[]} entries
 * @returns {string}
 */
export function sampleSubtitle(entries) {
  const contents = sampleContentsPhrase(entries, { article: false, conjunction: '&' });
  return contents ? `The Reading Sample — ${contents}` : 'The Reading Sample';
}

/** Book-level metadata baked into both formats. Placeholder author until the
 *  real byline lands (mirrors SITE.author in src/lib/site.ts). The subtitle is
 *  not here: it depends on which chapters are bundled — see `sampleSubtitle`. */
export const BOOK = {
  title: 'The Dominion Realm',
  series: 'Realmwalkers · Book One',
  author: 'The Dominion Realm',
  language: 'en',
  /** Stable identifier + timestamp keep EPUB output deterministic across builds. */
  identifier: 'urn:dominion-realm:reading-sample',
  modified: '2024-01-01T00:00:00Z',
};

/**
 * @typedef {{ text: string, bold: boolean, italic: boolean }} TextRun
 * @typedef {{ type: 'paragraph', runs: TextRun[] } | { type: 'scene-break' }} Block
 * @typedef {{ id: string, title: string, kind: string, order: number,
 *             summary: string, body: string }} SampleSource
 * @typedef {{ id: string, title: string, kind: string, order: number,
 *             summary: string, blocks: Block[] }} SampleChapter
 */

/** Human label for a chapter kind, matching readingKicker() in src/lib/reading.ts. */
export function kindLabel(kind) {
  return kind === 'prologue' ? 'Prologue' : 'Chapter';
}

/**
 * Parse a single paragraph's text into styled runs. Supports the Markdown
 * subset the reading sample actually uses: `**bold**` and `*italic*` (no
 * nesting). Unmatched `*` are emitted as literal text, so prose is never lost.
 * @param {string} text
 * @returns {TextRun[]}
 */
export function parseInline(text) {
  /** @type {TextRun[]} */
  const runs = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        runs.push({ text: text.slice(i + 2, end), bold: true, italic: false });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        runs.push({ text: text.slice(i + 1, end), bold: false, italic: true });
        i = end + 1;
        continue;
      }
    }
    // Plain text up to the next marker (or a stray `*`, emitted literally).
    let j = i;
    while (j < text.length && text[j] !== '*') j++;
    if (j === i) j = i + 1;
    runs.push({ text: text.slice(i, j), bold: false, italic: false });
    i = j;
  }
  return runs.filter((r) => r.text.length > 0);
}

/**
 * Split a Markdown body into blocks. Blank lines separate paragraphs; a line
 * that is only `---` (or `***`) is a scene break. Soft line breaks inside a
 * paragraph are collapsed to spaces.
 * @param {string} markdown
 * @returns {Block[]}
 */
export function parseBlocks(markdown) {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  /** @type {Block[]} */
  const blocks = [];
  for (const raw of normalized.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk) continue;
    if (/^(-{3,}|\*{3,})$/.test(chunk)) {
      blocks.push({ type: 'scene-break' });
      continue;
    }
    const text = chunk.replace(/\s*\n\s*/g, ' ');
    blocks.push({ type: 'paragraph', runs: parseInline(text) });
  }
  return blocks;
}

/** Escape a string for embedding in XML/XHTML text. */
export function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render styled runs to an XHTML inline fragment (`<strong>`/`<em>`). */
export function runsToXhtml(runs) {
  return runs
    .map((run) => {
      let html = escapeXml(run.text);
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.italic) html = `<em>${html}</em>`;
      return html;
    })
    .join('');
}

/** Render a block list to the XHTML body used inside an EPUB chapter document. */
export function blocksToXhtml(blocks) {
  return blocks
    .map((block) =>
      block.type === 'scene-break'
        ? '<hr class="scene-break" />'
        : `<p>${runsToXhtml(block.runs)}</p>`,
    )
    .join('\n');
}

/**
 * Build the ordered chapter model from raw reading sources. Sorts by `order`
 * (Prologue first) and parses each body into blocks — the single list both the
 * EPUB and PDF generators iterate.
 * @param {SampleSource[]} sources
 * @returns {SampleChapter[]}
 */
export function buildChapters(sources) {
  return [...sources]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind,
      order: s.order,
      summary: s.summary,
      blocks: parseBlocks(s.body),
    }));
}
