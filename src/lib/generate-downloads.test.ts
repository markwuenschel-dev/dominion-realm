import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateDownloads } from '../../scripts/generate-downloads';
import { EPUB_FILENAME, PDF_FILENAME } from '../../scripts/lib/sample-doc.mjs';

/**
 * RHA-02: generate-downloads.ts used to swallow a JSZip/PDFKit failure (log +
 * write an orphaned HTML fallback nothing links to) and exit 0, letting a
 * broken build ship with a 404'ing download link. It also exited 0 on zero
 * readable chapters, emitting neither artifact.
 *
 * generateDownloads() now: (1) treats either format failing, or zero
 * chapters, as fatal (throws); (2) stages both artifacts in a sibling temp
 * dir and only publishes into outDir after BOTH succeed, so a failure never
 * leaves partial output in the real download directory; (3) preserves the
 * original error as `cause` rather than flattening it to a string.
 */

const FAKE_SOURCES = [
  {
    id: 'prologue',
    title: 'Prologue',
    kind: 'prologue' as const,
    order: 0,
    summary: 'A test summary.',
    body: 'A simple paragraph.\n\nAnother paragraph with **bold** text.',
  },
];

let outDir: string;

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dominion-downloads-test-'));
});

afterEach(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

function fakeJSZipLoaderThatFails() {
  return () => Promise.reject(new Error('simulated JSZip import failure'));
}

function fakePDFDocumentLoaderThatFails() {
  return () => Promise.reject(new Error('simulated PDFKit import failure'));
}

async function realJSZipLoader() {
  const { default: JSZip } = await import('jszip');
  return JSZip;
}

async function realPDFDocumentLoader() {
  const { default: PDFDocument } = await import('pdfkit');
  return PDFDocument;
}

describe('generateDownloads (RHA-02)', () => {
  it('rejects and publishes neither artifact when EPUB generation fails', async () => {
    await expect(
      generateDownloads({
        sources: FAKE_SOURCES,
        outDir,
        loadJSZip: fakeJSZipLoaderThatFails(),
        loadPDFDocument: realPDFDocumentLoader,
      }),
    ).rejects.toThrow(/EPUB generation failed/);

    expect(fs.existsSync(path.join(outDir, EPUB_FILENAME))).toBe(false);
    expect(fs.existsSync(path.join(outDir, PDF_FILENAME))).toBe(false);
  });

  it('preserves the original error as cause, not a flattened string', async () => {
    const originalError = new Error('simulated JSZip import failure');
    await expect(
      generateDownloads({
        sources: FAKE_SOURCES,
        outDir,
        loadJSZip: () => Promise.reject(originalError),
        loadPDFDocument: realPDFDocumentLoader,
      }),
    ).rejects.toMatchObject({ cause: originalError });
  });

  it('rejects and publishes neither artifact when PDF generation fails', async () => {
    await expect(
      generateDownloads({
        sources: FAKE_SOURCES,
        outDir,
        loadJSZip: realJSZipLoader,
        loadPDFDocument: fakePDFDocumentLoaderThatFails(),
      }),
    ).rejects.toThrow(/PDF generation failed/);

    expect(fs.existsSync(path.join(outDir, EPUB_FILENAME))).toBe(false);
    expect(fs.existsSync(path.join(outDir, PDF_FILENAME))).toBe(false);
  });

  it('rejects on zero readable chapters instead of silently exiting', async () => {
    await expect(
      generateDownloads({
        sources: [],
        outDir,
        loadJSZip: realJSZipLoader,
        loadPDFDocument: realPDFDocumentLoader,
      }),
    ).rejects.toThrow(/no reading entries/);

    expect(fs.existsSync(outDir)).toBe(true);
    expect(fs.readdirSync(outDir)).toHaveLength(0);
  });

  it('publishes both real artifacts on a successful run', async () => {
    await generateDownloads({
      sources: FAKE_SOURCES,
      outDir,
      loadJSZip: realJSZipLoader,
      loadPDFDocument: realPDFDocumentLoader,
    });

    const epubPath = path.join(outDir, EPUB_FILENAME);
    const pdfPath = path.join(outDir, PDF_FILENAME);
    expect(fs.existsSync(epubPath)).toBe(true);
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.statSync(epubPath).size).toBeGreaterThan(0);
    expect(fs.statSync(pdfPath).size).toBeGreaterThan(0);
  });

  it('leaves no staging directory behind after a successful run', async () => {
    await generateDownloads({
      sources: FAKE_SOURCES,
      outDir,
      loadJSZip: realJSZipLoader,
      loadPDFDocument: realPDFDocumentLoader,
    });

    const siblings = fs.readdirSync(path.dirname(outDir));
    const stagingLeftovers = siblings.filter((name) => name.includes('downloads-staging'));
    expect(stagingLeftovers).toHaveLength(0);
  });

  it('leaves no staging directory behind after a failed run', async () => {
    await generateDownloads({
      sources: FAKE_SOURCES,
      outDir,
      loadJSZip: fakeJSZipLoaderThatFails(),
      loadPDFDocument: realPDFDocumentLoader,
    }).catch(() => {});

    const siblings = fs.readdirSync(path.dirname(outDir));
    const stagingLeftovers = siblings.filter((name) => name.includes('downloads-staging'));
    expect(stagingLeftovers).toHaveLength(0);
  });
});
