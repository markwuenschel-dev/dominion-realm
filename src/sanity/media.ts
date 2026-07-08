import 'server-only';
import { cache } from 'react';
import { sanityClient } from './client';

/**
 * The site's read seam into the Sanity media layer (ADR-0011, Phase 3).
 *
 * Every reader resolves to a plain `{ src, alt }` (or null), so call sites stay
 * ignorant of Sanity: they feed `src` straight to next/image and fall back to the
 * git `/content-media` path when a reader returns null — preserving the
 * Sanity → git → placeholder order the PRD mandates. `src` is the asset's own CDN
 * URL; next/image optimizes it (cdn.sanity.io is allow-listed in next.config).
 *
 * Each reader is wrapped in React `cache()` so a page that asks for the cover and
 * the cast map still makes one query per shape per request, deduped across the
 * component tree.
 */

export interface ResolvedImage {
  src: string;
  alt: string;
}

/** The homepage book cover from the `siteSettings` singleton, or null if unset. */
export const getSiteCover = cache(async (): Promise<ResolvedImage | null> => {
  const res = await sanityClient.fetch<{ url: string | null; alt: string | null } | null>(
    `*[_id == "siteSettings"][0]{ "url": cover.asset->url, "alt": cover.alt }`,
  );
  if (!res?.url) return null;
  return { src: res.url, alt: res.alt ?? 'The Dominion Realm' };
});

/**
 * Primary images for every character Subject, keyed by slug (the join back to the
 * git prose entry). Drafts are excluded. A Subject with no Primary asset simply
 * isn't in the map, so the call site falls back to its git portrait.
 */
export const getCharacterPrimaryMap = cache(async (): Promise<Map<string, ResolvedImage>> => {
  const rows = await sanityClient.fetch<
    Array<{ slug: string | null; url: string | null; alt: string | null }>
  >(
    `*[_type == "subject" && kind == "character" && !(_id in path("drafts.**"))]{
      "slug": slug.current, "url": primary.asset->url, "alt": primary.alt
    }`,
  );
  const map = new Map<string, ResolvedImage>();
  for (const r of rows) {
    if (r.slug && r.url) map.set(r.slug, { src: r.url, alt: r.alt ?? '' });
  }
  return map;
});
