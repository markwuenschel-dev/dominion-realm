import 'server-only';
import type { Metadata } from 'next';
import { urlFor, type SanityImageSource } from './image';
import { getSocialImage, type ResolvedImage } from './media';
import { isUngated, type RevealTier } from '@/lib/reveal';

/**
 * Social/link-preview (OG) image resolution (ADR-0011, Phase 4).
 *
 * The rule (see media PRD § Social images): a *teaser* entry's Primary, cropped
 * to the 1200×630 social frame, is its OG image. Everything else — an entry with
 * no Primary, every above-teaser (sealed) entry, and general site routes — gets
 * `siteSettings.socialImage`, cropped the same way, and finally the static
 * `public/og-default.png` so a shared link never 404s. Gallery / Banner / Map /
 * Sigil are never used as social art.
 *
 * We point metadata directly at the Sanity CDN crop — no Next-generated image
 * route, so a media edit needs no redeploy. `format('jpg')` (not `auto('format')`)
 * because some social scrapers don't accept webp/avif; a plain JPEG always renders.
 *
 * These run only inside `generateMetadata` (server), so importing the server-only
 * media readers is fine.
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Resilient last-resort social image — a real static file, resolved against
 *  `metadataBase` into an absolute URL by Next. */
export const OG_DEFAULT = '/og-default.png';

/** Crop a Sanity source to the 1200×630 social frame as a scraper-safe JPEG. */
function ogCrop(source: SanityImageSource): string {
  return urlFor(source)
    .width(OG_WIDTH)
    .height(OG_HEIGHT)
    .fit('crop')
    .format('jpg')
    .quality(80)
    .url();
}

/**
 * The default social image: the Sanity `siteSettings.socialImage` cropped to the
 * social frame, else the static `og-default.png`. Used for general routes,
 * entries with no Primary, and every above-teaser (sealed) entry.
 */
export const defaultSocialImage = async (): Promise<string> => {
  const social = await getSocialImage();
  return social ? ogCrop(social.source) : OG_DEFAULT;
};

/**
 * The OG image for a given source cropped to the social frame, else the default
 * social image. Used for ungated surfaces that pick their own hero without a
 * reveal tier to weigh — notably a reading chapter's Scene-art plate.
 */
export const socialImageFor = async (
  source: SanityImageSource | null | undefined,
): Promise<string> => {
  return source ? ogCrop(source) : defaultSocialImage();
};

/**
 * The OG image for an entry: a teaser entry's Primary cropped to the social
 * frame, else the default social image. Never a Gallery / Banner / Map / Sigil.
 */
export const entrySocialImage = async (
  reveal: RevealTier,
  primary: ResolvedImage | null | undefined,
): Promise<string> => {
  if (isUngated(reveal) && primary) return ogCrop(primary.source);
  return defaultSocialImage();
};

/**
 * Shape a publicly-previewable entry's real title/summary/image into OG + Twitter
 * metadata. Only call this for a teaser entry — a sealed entry must inherit the
 * generic site metadata (return `{}` from its `generateMetadata`) so its
 * title/summary never leak, matching the no-JavaScript reveal baseline.
 */
export function previewMetadata(title: string, description: string, image: string): Metadata {
  // Next merges metadata shallowly — a child `openGraph`/`twitter` replaces the
  // parent's whole object, so each must be self-contained (twitter re-declares
  // `card`, or it would fall back to a small summary card).
  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}
