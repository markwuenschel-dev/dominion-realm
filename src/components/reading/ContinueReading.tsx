'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readProgress } from '@/lib/readingProgress';

/** The chapters the index knows about, so the island can resolve a saved id. */
export interface ContinueChapter {
  id: string;
  title: string;
  url: string;
}

/**
 * "Continue where you left off" on the reading index. Reads the persisted
 * last-read position after mount (so there's no SSR/hydration mismatch — the
 * server renders nothing) and, if it points at a known chapter the reader is
 * partway through, offers a link straight back to it.
 */
export function ContinueReading({ chapters }: { chapters: ContinueChapter[] }) {
  const [resume, setResume] = useState<ContinueChapter | null>(null);

  useEffect(() => {
    const saved = readProgress();
    if (!saved || saved.scrollPct <= 0.02) return;
    const match = chapters.find((c) => c.id === saved.chapterId);
    if (match) setResume(match);
  }, [chapters]);

  if (!resume) return null;

  return (
    <Link className="reading-continue" href={resume.url}>
      <span className="reading-continue__label">Continue where you left off</span>
      <span className="reading-continue__title">{resume.title}</span>
      <span className="reading-continue__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
