'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PREFS,
  FONT_SCALE,
  LINE_HEIGHT,
  clampScroll,
  clampTo,
  readPrefs,
  readProgress,
  writePrefs,
  writeProgress,
  type ReadingPrefs,
} from '@/lib/readingProgress';

/**
 * The reading-sample reader controller for a single chapter. Renders a fixed
 * top progress bar and a prose-preferences toolbar; persists how far the reader
 * scrolled (so /read can offer "Continue"), restores that position on return,
 * and applies font-scale / line-height as CSS vars on the document element (the
 * server-rendered `.reading-prose` reads them). Renders defaults on the server
 * and first paint, then hydrates the reader's stored prefs — no mismatch.
 */
export function Reader({
  chapterId,
  minutes,
  part = 1,
}: {
  chapterId: string;
  minutes: number;
  /** 1-based scene-page, so persisted progress can resume the right scene. */
  part?: number;
}) {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const barRef = useRef<HTMLDivElement>(null);
  const lastWritten = useRef(0);

  // Push prefs onto the document element as CSS custom properties; the prose
  // stylesheet multiplies its base size by --reading-font-scale and reads
  // --reading-line-height. Cleared on unmount so other pages are unaffected.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reading-font-scale', String(prefs.fontScale));
    root.style.setProperty('--reading-line-height', String(prefs.lineHeight));
    return () => {
      root.style.removeProperty('--reading-font-scale');
      root.style.removeProperty('--reading-line-height');
    };
  }, [prefs]);

  // Load stored prefs after mount (keeps SSR/first paint at defaults).
  useEffect(() => {
    setPrefs(readPrefs());
  }, []);

  // Scroll tracking + persistence, and one-time resume of the saved position.
  useEffect(() => {
    const prose = document.querySelector<HTMLElement>('.reading-prose');
    if (!prose) return;

    const computePct = (): number => {
      const rect = prose.getBoundingClientRect();
      const proseTop = rect.top + window.scrollY;
      const height = rect.height || 1;
      const scrolled = window.scrollY + window.innerHeight - proseTop;
      return clampScroll(scrolled / height);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pct = computePct();
        if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`;
        // Only persist on a meaningful move — keeps writes off the hot path.
        if (Math.abs(pct - lastWritten.current) >= 0.01) {
          lastWritten.current = pct;
          writeProgress({ chapterId, scrollPct: pct, part });
        }
        ticking = false;
      });
    };

    // Resume: if this is the chapter we left mid-way, scroll back to it.
    const saved = readProgress();
    if (
      saved &&
      saved.chapterId === chapterId &&
      saved.scrollPct > 0.02 &&
      saved.scrollPct < 0.95
    ) {
      const rect = prose.getBoundingClientRect();
      const proseTop = rect.top + window.scrollY;
      const target = proseTop + saved.scrollPct * rect.height - window.innerHeight;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      requestAnimationFrame(() => window.scrollTo({ top: Math.max(0, target), behavior }));
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [chapterId, part]);

  const update = useCallback((patch: Partial<ReadingPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  const stepFont = (dir: 1 | -1) =>
    update({
      fontScale: clampTo(
        Math.round((prefs.fontScale + dir * FONT_SCALE.step) * 100) / 100,
        FONT_SCALE.min,
        FONT_SCALE.max,
        FONT_SCALE.default,
      ),
    });

  const stepLine = (dir: 1 | -1) =>
    update({
      lineHeight: clampTo(
        Math.round((prefs.lineHeight + dir * LINE_HEIGHT.step) * 10) / 10,
        LINE_HEIGHT.min,
        LINE_HEIGHT.max,
        LINE_HEIGHT.default,
      ),
    });

  return (
    <>
      <div className="reading-progress" aria-hidden="true">
        <div className="reading-progress__bar" ref={barRef} />
      </div>

      <div className="reading-controls" role="group" aria-label="Reading preferences">
        <span className="reading-controls__time">~{minutes} min</span>

        <div className="reading-controls__group" aria-label="Text size">
          <span className="reading-controls__label">Text</span>
          <button
            type="button"
            className="reading-controls__btn"
            onClick={() => stepFont(-1)}
            disabled={prefs.fontScale <= FONT_SCALE.min}
            aria-label="Decrease text size"
          >
            A−
          </button>
          <button
            type="button"
            className="reading-controls__btn"
            onClick={() => stepFont(1)}
            disabled={prefs.fontScale >= FONT_SCALE.max}
            aria-label="Increase text size"
          >
            A+
          </button>
        </div>

        <div className="reading-controls__group" aria-label="Line spacing">
          <span className="reading-controls__label">Spacing</span>
          <button
            type="button"
            className="reading-controls__btn"
            onClick={() => stepLine(-1)}
            disabled={prefs.lineHeight <= LINE_HEIGHT.min}
            aria-label="Decrease line spacing"
          >
            −
          </button>
          <button
            type="button"
            className="reading-controls__btn"
            onClick={() => stepLine(1)}
            disabled={prefs.lineHeight >= LINE_HEIGHT.max}
            aria-label="Increase line spacing"
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}
