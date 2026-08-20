// Build-time generator for the reading-sample downloads (Tier 3). Renders the
// reading-sample MDX bodies (Prologue + Chapter One under src/content/reading)
// into a single EPUB and a single PDF in `public/downloads/`, so `next build`
// always ships current files. Runs at prebuild/predev, mirroring
// `scripts/copy-content-media.mjs`. Generated output is gitignored.
//
// Pure logic (chapter assembly, Markdown→blocks parsing, XHTML rendering) lives
// in `scripts/lib/sample-doc.mjs` and is unit-tested; this file is the I/O +
// format shell (read content via contentCore, drive JSZip for EPUB and PDFKit
// for PDF, write). Draft chapters are always excluded from the sample.
//
// Both libraries are pure JavaScript (no native deps) and only used here at
// build time, so they never enter the Next.js client bundle. A failure in
// either format (or zero readable chapters) is fatal (audit RHA-02): both
// artifacts are staged in a sibling temp directory first and only moved into
// the real download directory once BOTH succeed, so a failed run never
// leaves partial or stale output behind, and the build fails loudly instead
// of shipping a download link that 404s.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { default as JSZipType } from 'jszip';
import type PDFDocument from 'pdfkit';
import { getReadingEntries } from '../src/lib/contentCore';
import { SITE } from '../src/lib/site';
import {
  bookWithAuthor,
  sampleSubtitle,
  DOWNLOAD_DIR,
  EPUB_FILENAME,
  PDF_FILENAME,
  buildChapters,
  blocksToXhtml,
  escapeXml,
  kindLabel,
} from './lib/sample-doc.mjs';

const BOOK = bookWithAuthor(SITE.author);
const OUT_DIR = path.join(process.cwd(), 'public', DOWNLOAD_DIR);
const FIXED_DATE = new Date(BOOK.modified);

type SampleChapter = ReturnType<typeof buildChapters>[number];
type TextRun = { text: string; bold: boolean; italic: boolean };
type Block = { type: 'paragraph'; runs: TextRun[] } | { type: 'scene-break' };
type PdfCtor = typeof PDFDocument;

/** Read reading-sample sources via the shared content engine (never drafts). */
function readSources() {
  return getReadingEntries('exclude').map((e) => ({
    id: e.id,
    title: e.data.title,
    kind: e.data.kind,
    order: e.data.order,
    summary: e.data.summary,
    body: e.body,
  }));
}

/** NCName-safe id for OPF manifest/spine references (XML ids can't start with a digit). */
const itemId = (id: string) => `ch-${id}`;

const STYLE_CSS = `body{font-family:Georgia,'Times New Roman',serif;line-height:1.6;margin:5% 6%;color:#1a1a1a;}
h1{font-size:1.7em;margin:0.2em 0 0.1em;font-weight:normal;}
.kicker{font-variant:small-caps;letter-spacing:0.18em;text-transform:uppercase;font-size:0.75em;color:#7a6a3a;margin:0;}
.summary{font-style:italic;color:#555;}
.title-rule{border:0;border-top:1px solid #c9b27a;width:40%;margin:1.4em auto;}
hr.scene-break{border:0;text-align:center;margin:1.6em 0;}
hr.scene-break:after{content:'\\2042';color:#9a8a5a;font-size:1.2em;}
p{text-align:justify;text-indent:1.4em;margin:0;}
p.kicker,p.summary{text-indent:0;text-align:left;}
.title-page{text-align:center;margin-top:30%;}
.title-page h1{font-size:2.4em;}
.title-page .sub{font-style:italic;color:#555;margin-top:0.6em;}
.title-page .series{font-variant:small-caps;letter-spacing:0.2em;color:#7a6a3a;margin-top:2em;}`;

const xhtmlDoc = (title: string, bodyInner: string, extraNs = '') =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"${extraNs} lang="${BOOK.language}" xml:lang="${BOOK.language}">
<head>
<meta charset="utf-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${bodyInner}
</body>
</html>`;

function chapterXhtml(ch: SampleChapter) {
  const inner = `<section epub:type="chapter">
<p class="kicker">${escapeXml(kindLabel(ch.kind))}</p>
<h1>${escapeXml(ch.title)}</h1>
<p class="summary">${escapeXml(ch.summary)}</p>
<hr class="title-rule"/>
${blocksToXhtml(ch.blocks)}
</section>`;
  return xhtmlDoc(ch.title, inner, ' xmlns:epub="http://www.idpf.org/2007/ops"');
}

function titleXhtml(subtitle: string) {
  const inner = `<section epub:type="titlepage" class="title-page">
<h1>${escapeXml(BOOK.title)}</h1>
<p class="sub">${escapeXml(subtitle)}</p>
<p class="series">${escapeXml(BOOK.series)}</p>
</section>`;
  return xhtmlDoc(BOOK.title, inner, ' xmlns:epub="http://www.idpf.org/2007/ops"');
}

function navXhtml(chapters: SampleChapter[]) {
  const items = chapters
    .map(
      (ch) =>
        `<li><a href="${ch.id}.xhtml">${escapeXml(kindLabel(ch.kind))} — ${escapeXml(ch.title)}</a></li>`,
    )
    .join('\n');
  const inner = `<nav epub:type="toc" id="toc">
<h1>Contents</h1>
<ol>
${items}
</ol>
</nav>`;
  return xhtmlDoc('Contents', inner, ' xmlns:epub="http://www.idpf.org/2007/ops"');
}

function contentOpf(chapters: SampleChapter[]) {
  const manifestItems = chapters
    .map(
      (ch) =>
        `<item id="${itemId(ch.id)}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join('\n    ');
  const spineItems = chapters.map((ch) => `<itemref idref="${itemId(ch.id)}"/>`).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${BOOK.language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(BOOK.identifier)}</dc:identifier>
    <dc:title>${escapeXml(`${BOOK.title}: ${sampleSubtitle(chapters)}`)}</dc:title>
    <dc:creator>${escapeXml(BOOK.author)}</dc:creator>
    <dc:language>${BOOK.language}</dc:language>
    <meta property="dcterms:modified">${BOOK.modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
    ${manifestItems}
  </manifest>
  <spine>
    <itemref idref="title"/>
    <itemref idref="nav"/>
    ${spineItems}
  </spine>
</package>`;
}

/** Build a valid EPUB 3 zip buffer with JSZip (deterministic: fixed file dates). */
async function buildEpub(JSZip: typeof JSZipType, chapters: SampleChapter[]) {
  const zip = new JSZip();
  // `mimetype` MUST be the first entry and stored uncompressed (EPUB OCF spec).
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', date: FIXED_DATE });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    { date: FIXED_DATE },
  );
  zip.file('OEBPS/style.css', STYLE_CSS, { date: FIXED_DATE });
  zip.file('OEBPS/title.xhtml', titleXhtml(sampleSubtitle(chapters)), { date: FIXED_DATE });
  zip.file('OEBPS/nav.xhtml', navXhtml(chapters), { date: FIXED_DATE });
  for (const ch of chapters) {
    zip.file(`OEBPS/${ch.id}.xhtml`, chapterXhtml(ch), { date: FIXED_DATE });
  }
  zip.file('OEBPS/content.opf', contentOpf(chapters), { date: FIXED_DATE });
  return zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/** Render the chapters to a PDF buffer with PDFKit (built-in Times fonts; no font files). */
async function buildPdf(PDFDocument: PdfCtor, chapters: SampleChapter[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A5',
    margins: { top: 56, bottom: 56, left: 50, right: 50 },
    info: {
      Title: `${BOOK.title}: ${sampleSubtitle(chapters)}`,
      Author: BOOK.author,
      Subject: BOOK.series,
      CreationDate: FIXED_DATE,
    },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  // Title page.
  doc.moveDown(6);
  doc.font('Times-Bold').fontSize(28).text(BOOK.title, { align: 'center' });
  doc.moveDown(0.6);
  doc
    .font('Times-Italic')
    .fontSize(13)
    .fillColor('#555')
    .text(sampleSubtitle(chapters), { align: 'center' });
  doc.moveDown(2);
  doc.font('Times-Roman').fontSize(11).fillColor('#7a6a3a').text(BOOK.series, { align: 'center' });
  doc.fillColor('black');

  for (const ch of chapters) {
    doc.addPage();
    doc
      .font('Times-Roman')
      .fontSize(10)
      .fillColor('#7a6a3a')
      .text(kindLabel(ch.kind).toUpperCase(), { align: 'center', characterSpacing: 2 });
    doc.moveDown(0.3);
    doc.font('Times-Bold').fontSize(20).fillColor('black').text(ch.title, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Times-Italic').fontSize(10.5).fillColor('#555').text(ch.summary, { align: 'center' });
    doc.fillColor('black').moveDown(1);

    for (const block of ch.blocks as Block[]) {
      if (block.type === 'scene-break') {
        doc.moveDown(0.4);
        doc.font('Times-Roman').fontSize(13).fillColor('#9a8a5a').text('⁂', { align: 'center' });
        doc.fillColor('black').moveDown(0.4);
        continue;
      }
      const runs = block.runs;
      runs.forEach((run, idx) => {
        const last = idx === runs.length - 1;
        const font = run.bold ? 'Times-Bold' : run.italic ? 'Times-Italic' : 'Times-Roman';
        doc
          .font(font)
          .fontSize(11.5)
          .text(run.text, {
            continued: !last,
            align: 'justify',
            lineGap: 1.5,
            indent: idx === 0 ? 16 : 0,
          });
      });
      doc.moveDown(0.5);
    }
  }

  doc.end();
  return done;
}

export interface GenerateDownloadsDeps {
  /** Injectable for tests. Defaults to the real dynamic `import('jszip')`. */
  loadJSZip: () => Promise<typeof JSZipType>;
  /** Injectable for tests. Defaults to the real dynamic `import('pdfkit')`. */
  loadPDFDocument: () => Promise<PdfCtor>;
  /** Publish destination. Defaults to `public/downloads/`. */
  outDir: string;
  /** Injectable for tests. Defaults to the real `readSources()` (contentCore). */
  sources: ReturnType<typeof readSources>;
}

const defaultLoadJSZip = async () => (await import('jszip')).default;
const defaultLoadPDFDocument = async () => (await import('pdfkit')).default;

/**
 * Generate both download artifacts and publish them, or throw. Either
 * format failing, or zero readable chapters, is fatal (audit RHA-02) — this
 * function never silently produces a partial or empty result. Both
 * artifacts are staged in a temp directory *next to* `outDir` (same
 * filesystem, so the final move is a plain rename, not a cross-device
 * copy) and only moved into `outDir` after both succeed, so a failed run
 * never leaves stale or partial output in the published location.
 */
export async function generateDownloads(deps: Partial<GenerateDownloadsDeps> = {}): Promise<void> {
  const loadJSZip = deps.loadJSZip ?? defaultLoadJSZip;
  const loadPDFDocument = deps.loadPDFDocument ?? defaultLoadPDFDocument;
  const outDir = deps.outDir ?? OUT_DIR;
  const sources = deps.sources ?? readSources();

  const chapters = buildChapters(sources);
  if (chapters.length === 0) {
    throw new Error('[downloads] no reading entries found — cannot generate downloads.');
  }

  const stagingDir = fs.mkdtempSync(path.join(path.dirname(outDir), '.downloads-staging-'));
  try {
    let epub: Buffer;
    try {
      const JSZip = await loadJSZip();
      epub = await buildEpub(JSZip, chapters);
    } catch (err) {
      throw new Error('[downloads] EPUB generation failed', { cause: err });
    }
    fs.writeFileSync(path.join(stagingDir, EPUB_FILENAME), epub);

    let pdf: Buffer;
    try {
      const PDFDocument = await loadPDFDocument();
      pdf = await buildPdf(PDFDocument, chapters);
    } catch (err) {
      throw new Error('[downloads] PDF generation failed', { cause: err });
    }
    fs.writeFileSync(path.join(stagingDir, PDF_FILENAME), pdf);

    // Both succeeded — publish. Clear the destination first so a stale file
    // from a prior successful run (of a since-removed chapter, say) can
    // never survive next to fresh output.
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.renameSync(path.join(stagingDir, EPUB_FILENAME), path.join(outDir, EPUB_FILENAME));
    fs.renameSync(path.join(stagingDir, PDF_FILENAME), path.join(outDir, PDF_FILENAME));
    console.log(`[downloads] wrote ${DOWNLOAD_DIR}/${EPUB_FILENAME} (${epub.length} bytes)`);
    console.log(`[downloads] wrote ${DOWNLOAD_DIR}/${PDF_FILENAME} (${pdf.length} bytes)`);
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

async function main() {
  await generateDownloads();
}

// Only auto-run when executed directly (`tsx scripts/generate-downloads.ts`,
// per package.json's prebuild/predev) -- not when imported for its exports
// (generate-downloads.test.ts imports `generateDownloads` directly).
const isMainModule =
  process.argv[1] != null && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err: unknown) => {
    console.error('[downloads] generation aborted:', err);
    process.exit(1);
  });
}
