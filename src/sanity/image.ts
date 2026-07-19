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

/** Options for a single fixed-crop image URL. */
export interface ImageUrlOptions {
  width: number;
  height?: number;
  fit?: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'min' | 'scale';
  format?: 'jpg' | 'pjpg' | 'png' | 'webp';
  auto?: 'format';
  quality?: number;
}

/**
 * A single fixed-crop Sanity CDN URL — the one-shot counterpart to
 * `SubjectImage`'s responsive `next/image` loader (which is a width→url function
 * and stays separate). Owns the crop/format chain so pages and the OG builder
 * stop hand-assembling `.width().height().fit('crop')…`, and nothing (e.g. the
 * `/eyes` page) bypasses the focal-point crop with its own inline chain.
 */
export function imageUrl(source: SanityImageSource, opts: ImageUrlOptions): string {
  let b = urlFor(source).width(opts.width);
  if (opts.height !== undefined) b = b.height(opts.height);
  if (opts.fit) b = b.fit(opts.fit);
  if (opts.format) b = b.format(opts.format);
  if (opts.auto) b = b.auto(opts.auto);
  if (opts.quality !== undefined) b = b.quality(opts.quality);
  return b.url();
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
