import { EPUB_HREF, PDF_HREF } from '../../scripts/lib/sample-doc.mjs';

/**
 * UI contract for the reading-sample downloads (Tier 3). The files themselves
 * are generated at prebuild by `scripts/generate-downloads.ts` into
 * `public/downloads/`; this module exposes the hrefs/labels the `/read` page
 * links to, re-exporting the canonical paths from the generator's pure core so
 * filenames live in exactly one place.
 */

export interface SampleDownload {
  /** Short format label, e.g. "EPUB". */
  format: string;
  /** Public href under /downloads (served from public/). */
  href: string;
  /** Filename used for the download attribute. */
  filename: string;
  /** One-line "what is this / who is it for" hint. */
  hint: string;
}

export const SAMPLE_DOWNLOADS: SampleDownload[] = [
  {
    format: 'EPUB',
    href: EPUB_HREF,
    filename: EPUB_HREF.split('/').pop() as string,
    hint: 'For Kindle, Kobo, Apple Books & most e-readers',
  },
  {
    format: 'PDF',
    href: PDF_HREF,
    filename: PDF_HREF.split('/').pop() as string,
    hint: 'For printing or reading on any device',
  },
];

/** The download descriptors to surface on the reading page. */
export function getSampleDownloads(): SampleDownload[] {
  return SAMPLE_DOWNLOADS;
}
