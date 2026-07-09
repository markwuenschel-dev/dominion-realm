'use client';

import Image, { type ImageLoader } from 'next/image';
import { urlFor, imageDimensions, type SanityImageSource } from '@/sanity/image';

interface SubjectImageProps {
  /** Raw Sanity image source (asset ref + hotspot) from a media reader. */
  source: SanityImageSource;
  alt: string;
  /** next/image `sizes` — required for responsive srcset. */
  sizes: string;
  /** LCP hint; set on the hero cover only. */
  priority?: boolean;
  className?: string;
  /**
   * Layout mode. `true` (default) fills a sized, position:relative parent (cast
   * cards, codex cards, cover); `false` renders at the image's intrinsic ratio
   * (the codex detail primary, whose container is width:100%/height:auto).
   */
  fill?: boolean;
  /**
   * When filling, the box aspect as [w, h] — the loader crops to it on the
   * author's hotspot (heads never cut off). Omit for no crop (e.g. the cover,
   * shown whole with objectFit:contain).
   */
  aspect?: [number, number];
  objectFit?: 'cover' | 'contain';
}

/**
 * Renders a Sanity image through Sanity's own image CDN (ADR-0011, Phase 3).
 *
 * A per-instance `next/image` loader routes each requested width through
 * `urlFor`, so the CDN returns a hotspot-cropped, right-sized, auto-format image
 * for every `srcset` entry — keeping responsive + lazy loading while honoring the
 * focal point set in Studio. (This is a Client Component because `next/image`
 * forbids passing a loader function across the server→client boundary; the plain
 * `source` object serializes fine.)
 */
export function SubjectImage({
  source,
  alt,
  sizes,
  priority,
  className,
  fill = true,
  aspect,
  objectFit = 'cover',
}: SubjectImageProps) {
  const loader: ImageLoader = ({ width, quality }) => {
    let b = urlFor(source)
      .width(width)
      .auto('format')
      .quality(quality ?? 75);
    if (aspect) b = b.height(Math.round((width * aspect[1]) / aspect[0])).fit('crop');
    else b = b.fit('max');
    return b.url();
  };

  // next/image requires a string `src` even with a custom loader — it's used as
  // the cache key; the loader is what actually builds every rendered URL.
  const src = urlFor(source).width(1200).url();

  if (fill) {
    return (
      <Image
        loader={loader}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        style={{ objectFit }}
      />
    );
  }

  const { width, height } = imageDimensions(source);
  return (
    <Image
      loader={loader}
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}
