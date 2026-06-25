// Build-time generator for the reading-sample downloads (Tier 3). Renders the
// reading-sample MDX bodies (Prologue + Chapter One under src/content/reading)
// into a single EPUB and a single PDF in `public/downloads/`, so `next build`
// always ships current files. Runs at prebuild/predev, mirroring
// `scripts/copy-content-media.mjs`. Generated output is gitignored.
//
// Pure logic (chapter assembly, Markdown→blocks parsing, XHTML rendering) lives
// in `scripts/lib/sample-doc.mjs` and is unit-tested; this file is the I/O +
// format shell (read content, drive JSZip for EPUB and PDFKit for PDF, write).
//
// Both libraries are pure JavaScript (no native deps) and only used here at
// build time, so they never enter the Next.js client bundle. If either fails to
// load (e.g. a stripped-down container), we fall back to writing a readable
// HTML document with the same chapter content and a `.html` companion, and log
// loudly — the UI still links the EPUB/PDF hrefs, which then 404 until a full
// build runs. See README note in this file's header for what the author supplies.
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import {
  BOOK,
  DOWNLOAD_DIR,
  EPUB_FILENAME,
  PDF_FILENAME,
  buildChapters,
  blocksToXhtml,
  escapeXml,
  kindLabel,
} from './lib/sample-doc.mjs';

const READING_DIR = path.join(process.cwd(), 'src', 'content', 'reading');
const OUT_DIR = path.join(process.cwd(), 'public', DOWNLOAD_DIR);
const FIXED_DATE = new Date(BOOK.modified);

/** Read the reading-sample sources from disk (frontmatter + raw body). */
function readSources() {
  if (!fs.existsSync(READING_DIR)) return [];
  const files = fg.sync('**/*.{md,mdx}', { cwd: READING_DIR });
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(READING_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      return {
        id: file.replace(/\.mdx?$/, ''),
        title: String(data.title ?? file),
        kind: data.kind === 'prologue' ? 'prologue' : 'chapter',
        order: typeof data.order === 'number' ? data.order : 0,
        summary: String(data.summary ?? ''),
        body: content,
        draft: data.draft === true,
      };
    })
    .filter((s) => !s.draft);
}

/** NCName-safe id for OPF manifest/spine references (XML ids can't start with a digit). */
const itemId = (id) => `ch-${id}`;

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

const xhtmlDoc = (title, bodyInner, extraNs = '') =>
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

function chapterXhtml(ch) {
  const inner = `<section epub:type="chapter">
<p class="kicker">${escapeXml(kindLabel(ch.kind))}</p>
<h1>${escapeXml(ch.title)}</h1>
<p class="summary">${escapeXml(ch.summary)}</p>
<hr class="title-rule"/>
${blocksToXhtml(ch.blocks)}
</section>`;
  return xhtmlDoc(ch.title, inner, ' xmlns:epub="http://www.idpf.org/2007/ops"');
}

function titleXhtml() {
  const inner = `<section epub:type="titlepage" class="title-page">
<h1>${escapeXml(BOOK.title)}</h1>
<p class="sub">${escapeXml(BOOK.subtitle)}</p>
<p class="series">${escapeXml(BOOK.series)}</p>
</section>`;
  return xhtmlDoc(BOOK.title, inner, ' xmlns:epub="http://www.idpf.org/2007/ops"');
}

function navXhtml(chapters) {
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

function contentOpf(chapters) {
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
    <dc:title>${escapeXml(`${BOOK.title}: ${BOOK.subtitle}`)}</dc:title>
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
async function buildEpub(JSZip, chapters) {
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
  zip.file('OEBPS/title.xhtml', titleXhtml(), { date: FIXED_DATE });
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
async function buildPdf(PDFDocument, chapters) {
  const doc = new PDFDocument({
    size: 'A5',
    margins: { top: 56, bottom: 56, left: 50, right: 50 },
    info: {
      Title: `${BOOK.title}: ${BOOK.subtitle}`,
      Author: BOOK.author,
      Subject: BOOK.series,
      CreationDate: FIXED_DATE,
    },
  });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Title page.
  doc.moveDown(6);
  doc.font('Times-Bold').fontSize(28).text(BOOK.title, { align: 'center' });
  doc.moveDown(0.6);
  doc.font('Times-Italic').fontSize(13).fillColor('#555').text(BOOK.subtitle, { align: 'center' });
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

    for (const block of ch.blocks) {
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

/** Documented fallback: a single readable HTML file when a generator lib is missing. */
function writeHtmlFallback(format, chapters) {
  const body = chapters
    .map(
      (ch) =>
        `<section><p class="kicker">${escapeXml(kindLabel(ch.kind))}</p><h1>${escapeXml(
          ch.title,
        )}</h1><p class="summary">${escapeXml(ch.summary)}</p><hr class="title-rule"/>${blocksToXhtml(
          ch.blocks,
        )}</section>`,
    )
    .join('\n');
  const html = `<!DOCTYPE html><html lang="${BOOK.language}"><head><meta charset="utf-8"/><title>${escapeXml(
    BOOK.title,
  )}</title><style>${STYLE_CSS}</style></head><body><section class="title-page"><h1>${escapeXml(
    BOOK.title,
  )}</h1><p class="sub">${escapeXml(BOOK.subtitle)}</p></section>${body}</body></html>`;
  const file = path.join(OUT_DIR, `${format}-fallback.html`);
  fs.writeFileSync(file, html, 'utf8');
  console.warn(`[downloads] FALLBACK: wrote ${path.relative(process.cwd(), file)} (HTML).`);
}

async function main() {
  const sources = readSources();
  const chapters = buildChapters(sources);
  if (chapters.length === 0) {
    console.warn('[downloads] no reading entries found — skipping download generation.');
    return;
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // EPUB
  try {
    const { default: JSZip } = await import('jszip');
    const epub = await buildEpub(JSZip, chapters);
    fs.writeFileSync(path.join(OUT_DIR, EPUB_FILENAME), epub);
    console.log(`[downloads] wrote ${DOWNLOAD_DIR}/${EPUB_FILENAME} (${epub.length} bytes)`);
  } catch (err) {
    console.error(`[downloads] EPUB generation failed: ${err?.message ?? err}`);
    writeHtmlFallback('epub', chapters);
  }

  // PDF
  try {
    const { default: PDFDocument } = await import('pdfkit');
    const pdf = await buildPdf(PDFDocument, chapters);
    fs.writeFileSync(path.join(OUT_DIR, PDF_FILENAME), pdf);
    console.log(`[downloads] wrote ${DOWNLOAD_DIR}/${PDF_FILENAME} (${pdf.length} bytes)`);
  } catch (err) {
    console.error(`[downloads] PDF generation failed: ${err?.message ?? err}`);
    writeHtmlFallback('pdf', chapters);
  }
}

main().catch((err) => {
  console.error('[downloads] generation aborted:', err);
  process.exit(1);
});
