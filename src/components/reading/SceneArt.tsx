'use client';

import { useCallback, useState } from 'react';
import { SubjectImage } from '../SubjectImage';
import { ImageCredit } from '../ImageCredit';
import { Lightbox } from '../Lightbox';
import type { GalleryImage } from '@/sanity/media';

/** The chapter-opening plate crop — a wide, cinematic banner at the doorway of
 *  the chapter, not a portrait. */
const PLATE_ASPECT: [number, number] = [16, 9];

/**
 * A reading chapter's Scene-art opening plate (CONTEXT.md § Scene art): the first
 * image renders as a wide hero at the top of the chapter's first page; any extra
 * images open the shared Lightbox behind a single affordance, so a chapter with
 * one image is just a plate and a multi-image chapter degrades gracefully. Shown
 * in place of the git hero when a Scene exists (Sanity → git → nothing); rendered
 * only on part 1, and only when `images` is non-empty.
 */
export function SceneArt({
  images,
  title,
  priority = true,
}: {
  images: GalleryImage[];
  title: string;
  /** LCP hint for the reading chapter plate; timeline beats leave this off. */
  priority?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i == null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  );

  if (images.length === 0) return null;
  const hero = images[0];
  const many = images.length > 1;

  return (
    <figure className="scene-art">
      <button
        type="button"
        className="scene-art__plate"
        onClick={() => setOpenIndex(0)}
        aria-label={
          many
            ? `Open the ${images.length} scene images for ${title}`
            : `View the scene image for ${title} full size`
        }
      >
        <SubjectImage
          source={hero.source}
          alt={hero.alt || title}
          aspect={PLATE_ASPECT}
          sizes="(max-width: 760px) 100vw, 680px"
          priority={priority}
        />
      </button>
      {(hero.caption || many) && (
        <figcaption className="scene-art__caption">
          {hero.caption}
          {many && (
            <span className="scene-art__count">
              {hero.caption ? ' · ' : ''}
              {images.length} images — click to view
            </span>
          )}
        </figcaption>
      )}
      <ImageCredit credit={hero.credit} />
      {openIndex != null && (
        <Lightbox items={images} index={openIndex} name={title} onClose={close} onStep={step} />
      )}
    </figure>
  );
}
