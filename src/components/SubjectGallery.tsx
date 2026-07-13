'use client';

import { useCallback, useState } from 'react';
import { SubjectImage } from './SubjectImage';
import { ImageCredit } from './ImageCredit';
import { Lightbox } from './Lightbox';
import type { GalleryImage, ResolvedImage } from '@/sanity/media';

interface SubjectGalleryProps {
  /** The Subject's Primary image, shown large and first in the lightbox. */
  primary: ResolvedImage | null;
  /** Ordered gallery images (each with an optional caption). */
  gallery: GalleryImage[];
  /** Subject name, for alt/aria fallbacks. */
  name: string;
}

/**
 * The codex detail media island (ADR-0011, Phase 3): the Primary image plus an
 * ordered thumbnail grid, any of which opens a lightbox with caption + keyboard
 * navigation. A Client Component because the lightbox is interactive; it's
 * rendered only when a Subject actually has Sanity media, so it stays dormant
 * (renders nothing) for entries whose art hasn't been uploaded yet.
 */
export function SubjectGallery({ primary, gallery, name }: SubjectGalleryProps) {
  // The lightbox walks a single ordered list: primary first (if any), then gallery.
  const items: GalleryImage[] = [...(primary ? [{ ...primary, caption: '' }] : []), ...gallery];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i == null ? i : (i + delta + items.length) % items.length)),
    [items.length],
  );

  if (items.length === 0) return null;

  return (
    <>
      {primary && (
        <figure className="codex-entry__media">
          <button
            type="button"
            className="codex-entry__media-open"
            onClick={() => setOpenIndex(0)}
            aria-label={`Open the full-size images for ${name}`}
          >
            <SubjectImage
              source={primary.source}
              alt={primary.alt || name}
              fill={false}
              sizes="(max-width: 760px) 100vw, 680px"
            />
          </button>
          <figcaption className="codex-entry__media-hint">
            {items.length > 1 ? 'Click to open the gallery' : 'Click to view full size'}
          </figcaption>
          <ImageCredit credit={primary.credit} />
        </figure>
      )}

      {gallery.length > 0 && (
        <div className="codex-gallery" role="list">
          {gallery.map((g, i) => (
            <button
              type="button"
              key={i}
              className="codex-gallery__thumb"
              role="listitem"
              onClick={() => setOpenIndex((primary ? 1 : 0) + i)}
              aria-label={g.alt || `Gallery image ${i + 1} for ${name}`}
            >
              <SubjectImage source={g.source} alt={g.alt} aspect={[4, 3]} sizes="220px" />
            </button>
          ))}
        </div>
      )}

      {openIndex != null && (
        <Lightbox items={items} index={openIndex} name={name} onClose={close} onStep={step} />
      )}
    </>
  );
}
