import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContinueReading } from './ContinueReading';
import { READING_PROGRESS_KEY } from '@/lib/readingProgress';

/**
 * The "Continue where you left off" island: server-silent, then after mount it
 * resolves the persisted last-read position against the known chapters and
 * offers a resume link — but only for a chapter the reader is genuinely partway
 * through.
 */
const chapters = [
  { id: '00-prologue', title: 'Prologue', url: '/read/00-prologue' },
  { id: '01-chapter-one', title: 'Chapter One', url: '/read/01-chapter-one' },
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

  it('renders nothing when the saved chapter is unknown', () => {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({ chapterId: 'ghost', scrollPct: 0.6 }),
    );
    const { container } = render(<ContinueReading chapters={chapters} />);
    expect(container).toBeEmptyDOMElement();
  });
});
