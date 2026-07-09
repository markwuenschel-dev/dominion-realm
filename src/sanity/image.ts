import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { projectId, dataset } from './env';

/**
 * Client-safe image URL layer for the Sanity media (ADR-0011, Phase 3).
 *
 * Deliberately built from the public `projectId`/`dataset` (NEXT_PUBLIC) rather
 * than the server-only `sanityClient`, so this module can be imported into a
 * Client Component (`SubjectImage`) without dragging the server client into the
 * browser bundle. `urlFor` returns a builder the caller sizes/crops — Sanity's
 * CDN is the image optimizer (auto webp/avif, focal-point crop), so we let it do
 * the work rather than re-optimizing through `/_next/image`.
 */
const builder = createImageUrlBuilder({ projectId, dataset });

/** Sanity image-URL builder for a source (image object with asset ref + hotspot). */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export type { SanityImageSource };

/**
 * Parse an asset's intrinsic pixel size out of its `_ref`
 * (`image-<hash>-<W>x<H>-<ext>`). Used to give `next/image` real width/height for
 * natural-aspect renders (the codex detail primary) so it emits a correct srcset
 * without a fixed-aspect box. Falls back to a 3:4 portrait guess if the ref is
 * an unexpected shape.
 */
export function imageDimensions(source: SanityImageSource): { width: number; height: number } {
  const ref =
    typeof source === 'object' && source && 'asset' in source
      ? (source.asset as { _ref?: string })?.['_ref']
      : typeof source === 'string'
        ? source
        : undefined;
  const m = ref?.match(/-(\d+)x(\d+)-/);
  if (m) return { width: Number(m[1]), height: Number(m[2]) };
  return { width: 900, height: 1200 };
}
