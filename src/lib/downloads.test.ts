import { describe, it, expect } from 'vitest';
import { getSampleDownloads, SAMPLE_DOWNLOADS } from './downloads';
import { EPUB_HREF, PDF_HREF } from '../../scripts/lib/sample-doc.mjs';

/**
 * Reading-sample download contract surfaced on /read. Asserts the descriptors
 * stay in sync with the generator's canonical hrefs (single source of truth).
 */
describe('getSampleDownloads', () => {
  it('returns EPUB and PDF descriptors', () => {
    const formats = getSampleDownloads().map((d) => d.format);
    expect(formats).toEqual(['EPUB', 'PDF']);
  });

  it('links the canonical generator hrefs and derives a filename from each', () => {
    const byFormat = Object.fromEntries(SAMPLE_DOWNLOADS.map((d) => [d.format, d]));
    expect(byFormat.EPUB.href).toBe(EPUB_HREF);
    expect(byFormat.PDF.href).toBe(PDF_HREF);
    expect(byFormat.EPUB.filename).toBe(EPUB_HREF.split('/').pop());
    expect(byFormat.PDF.filename).toBe(PDF_HREF.split('/').pop());
  });

  it('gives every download a non-empty hint', () => {
    for (const d of SAMPLE_DOWNLOADS) {
      expect(d.hint.length).toBeGreaterThan(0);
    }
  });
});
