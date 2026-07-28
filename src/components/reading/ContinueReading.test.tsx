import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContinueReading } from './ContinueReading';
import { READING_PROGRESS_KEY } from '@/lib/readingProgress';
import { getReadingEntries, parseLaterScenePart, scenePageCount, readingUrl } from '@/lib/reading';

/**
 * The "Continue where you left off" island: server-silent, then after mount it
 * resolves the persisted last-read position against the known chapters and
 * offers a resume link — but only for a chapter the reader is genuinely partway
 * through.
 */
const chapters = [
  // `parts` is the chapter's CURRENT scene-page count — 1 when it doesn't paginate.
  { id: '00-prologue', title: 'Prologue', url: '/read/00-prologue', parts: 1 },
  { id: '01-chapter-one', title: 'Chapter One', url: '/read/01-chapter-one', parts: 2 },
];

afterEach(() => localStorage.clear());

describe('ContinueReading', () => {
  it('offers a resume link for a chapter left mid-way', async () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: '01-chapter-one', scrollPct: 0.5 }),
    );
    render(<ContinueReading chapters={chapters} />);
    const link = await screen.findByRole('link', { name: /Continue where you left off/i });
    expect(link).toHaveAttribute('href', '/read/01-chapter-one');
    expect(link).toHaveTextContent('Chapter One');
  });

  it('renders nothing when there is no stored progress', () => {
    const { container } = render(<ContinueReading chapters={chapters} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when barely into a chapter (scroll ≤ 2%)', () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: '00-prologue', scrollPct: 0.01 }),
    );
    const { container } = render(<ContinueReading chapters={chapters} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the chapter is finished (scroll ≥ 95%)', () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: '01-chapter-one', scrollPct: 0.97 }),
    );
    const { container } = render(<ContinueReading chapters={chapters} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the saved chapter is unknown', () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: 'ghost', scrollPct: 0.6 }),
    );
    const { container } = render(<ContinueReading chapters={chapters} />);
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * A stored `part` is historical data: it records where the reader was when they
 * last visited, not what the chapter looks like now. If a chapter is shortened,
 * de-paginated, or its scene breaks move, the saved part can name a scene-page
 * that no longer exists — and the HTTP route deliberately REJECTS out-of-range
 * parts rather than clamping them (`parseLaterScenePart`, audit CAND-22). So an
 * unvalidated resume link sends a returning reader straight to a 404.
 *
 * The index owns the nearest-valid answer here, via the existing `clampPart`
 * seam that `lib/reading.ts` already documents as "for non-HTTP callers that want
 * a nearest-valid index".
 */
describe('ContinueReading — a stale saved part must not outlive the chapter', () => {
  it('clamps a saved part past the end down to the last real scene-page', async () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: '01-chapter-one', scrollPct: 0.6, part: 5 }),
    );
    render(<ContinueReading chapters={chapters} />);
    const link = await screen.findByRole('link', { name: /Continue where you left off/i });
    // The chapter has 2 scene-pages, so part 5 is historical: resume at 2, not /5.
    expect(link).toHaveAttribute('href', '/read/01-chapter-one/2');
  });

  it('drops the part entirely when the chapter no longer paginates', async () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: '00-prologue', scrollPct: 0.6, part: 3 }),
    );
    render(<ContinueReading chapters={chapters} />);
    const link = await screen.findByRole('link', { name: /Continue where you left off/i });
    expect(link).toHaveAttribute('href', '/read/00-prologue');
  });

  it('still honours a part that is genuinely in range', async () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: '01-chapter-one', scrollPct: 0.6, part: 2 }),
    );
    render(<ContinueReading chapters={chapters} />);
    const link = await screen.findByRole('link', { name: /Continue where you left off/i });
    expect(link).toHaveAttribute('href', '/read/01-chapter-one/2');
  });

  /**
   * Cross-seam integration: builds the chapter list from the REAL content tree the
   * way `/read` does, renders the real component, then feeds the href it emitted
   * through the REAL route validator. No mocks, no re-implemented rule — if the
   * component can ever emit a part the route would 404, this fails.
   */
  it('never emits a part the real /read/[id]/[part] route would reject', async () => {
    const entries = getReadingEntries();
    const real = entries.map((e) => ({
      id: e.id,
      title: e.data.title,
      url: readingUrl(e.id),
      // Same seam `/read` uses — re-deriving the rule here would let the page and
      // this test drift apart while both stayed green.
      parts: scenePageCount(e),
    }));
    const paginated = real.find((c) => c.parts > 1);
    expect(paginated, 'fixture reachability: need one paginated chapter').toBeDefined();

    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: paginated!.id, scrollPct: 0.6, part: 999 }),
    );
    render(<ContinueReading chapters={real} />);
    const link = await screen.findByRole('link', { name: /Continue where you left off/i });

    const href = link.getAttribute('href')!;
    const segment = href.slice(`/read/${paginated!.id}`.length).replace(/^\//, '');
    if (segment) {
      // A later-scene URL was emitted — the real route parser must accept it.
      expect(parseLaterScenePart(segment, paginated!.parts)).not.toBeNull();
    } else {
      expect(href).toBe(`/read/${paginated!.id}`);
    }
  });
});
