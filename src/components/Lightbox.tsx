'use client';

import { useEffect } from 'react';
import { SubjectImage } from './SubjectImage';
import { ImageCredit } from './ImageCredit';
import type { GalleryImage } from '@/sanity/media';

interface LightboxProps {
  items: GalleryImage[];
  index: number;
  /** Name/title for alt + aria fallbacks. */
  name: string;
  onClose: () => void;
  onStep: (delta: number) => void;
}

/**
 * Fullscreen overlay for one image, with caption, credit, prev/next, and keyboard
 * nav (ADR-0011, Phase 3). Shared by the codex gallery and the reading Scene-art
 * plate; each caller owns the open index and the step/close handlers, so this
 * component stays a pure, reusable view.
 */
export function Lightbox({ items, index, name, onClose, onStep }: LightboxProps) {
  const many = items.length > 1;
  const current = items[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (many && e.key === 'ArrowRight') onStep(1);
      else if (many && e.key === 'ArrowLeft') onStep(-1);
    }
    document.addEventListener('keydown', onKey);
    // Lock body scroll while the overlay is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [many, onClose, onStep]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — image ${index + 1} of ${items.length}`}
      onClick={onClose}
    >
      <button type="button" className="lightbox__close" aria-label="Close" onClick={onClose}>
        ✕
      </button>
      {many && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation();
            onStep(-1);
          }}
        >
          ‹
        </button>
      )}
      <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox__frame">
          <SubjectImage
            source={current.source}
            alt={current.alt || name}
            fill
            objectFit="contain"
            sizes="(max-width: 900px) 100vw, 900px"
          />
        </div>
        {current.caption && (
          <figcaption className="lightbox__caption">{current.caption}</figcaption>
        )}
        <ImageCredit credit={current.credit} className="lightbox__credit" />
      </figure>
      {many && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          aria-label="Next image"
          onClick={(e) => {
            e.stopPropagation();
            onStep(1);
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
