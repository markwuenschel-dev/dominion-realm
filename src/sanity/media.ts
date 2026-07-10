import 'server-only';
import { cache } from 'react';
import { sanityClient } from './client';
import type { SanityImageSource } from './image';
import type { CodexCollection } from '@/lib/content';
import type { SubjectKind } from './slotMap';

/**
 * The site's read seam into the Sanity media layer (ADR-0011, Phase 3).
 *
 * Readers resolve to a Sanity image *source* (the raw image object — asset ref +
 * hotspot + alt) so call sites can crop/size it via `urlFor` at render time
 * (`SubjectImage`). A reader returning `null`/absent means "no Sanity art", and
 * the call site falls back to the git `/content-media` path, then the monogram
 * placeholder — the Sanity → git → placeholder order the PRD mandates.
 *
 * Every read is stamped with the shared `sanity` cache tag and opts into the Next
 * Data Cache, so the `/api/revalidate` webhook can `revalidateTag('sanity')` to
 * refresh all Sanity-fed pages after a Studio edit (the client uses `useCdn:false`
 * so that refetch returns fresh data, not an edge-cached copy).
 *
 * Each reader is wrapped in React `cache()` so a page that asks for the primary
 * map and one Subject's media still makes one query per shape per request.
 */

/** Cache tag every Sanity read carries; the revalidation webhook busts it. */
const SANITY_TAG = 'sanity';

/** A resolved Sanity image: its source (for `urlFor`) plus alt text. */
export interface ResolvedImage {
  source: SanityImageSource;
  alt: string;
}

/** A gallery item — a resolved image plus its optional caption. */
export interface GalleryImage extends ResolvedImage {
  caption: string;
}

/** Full media for one Subject: the universal primary + gallery, plus type slots. */
export interface SubjectMedia {
  primary: ResolvedImage | null;
  gallery: GalleryImage[];
  banner: ResolvedImage | null;
  map: ResolvedImage | null;
  sigil: ResolvedImage | null;
}

/** A raw Sanity image field as returned by GROQ (asset ref + optional meta). */
type RawImage = (SanityImageSource & { alt?: string; caption?: string }) | null | undefined;

/** Map a git codex collection to its Sanity `Subject.kind`. The join is by
 *  collection, NOT the git `kind:` taxonomy (which is finer-grained content). */
const COLLECTION_KIND: Record<CodexCollection, SubjectKind> = {
  characters: 'character',
  concepts: 'concept',
  factions: 'faction',
  places: 'place',
};

/** The `kind:slug` key both readers use — kind disambiguates cross-collection
 *  slug collisions. */
export function subjectKey(collection: CodexCollection, slug: string): string {
  return `${COLLECTION_KIND[collection]}:${slug}`;
}

/** Coerce a raw GROQ image field into a ResolvedImage, or null when unset. */
function resolve(img: RawImage): ResolvedImage | null {
  if (!img || typeof img !== 'object' || !('asset' in img) || !img.asset) return null;
  return { source: img, alt: img.alt ?? '' };
}

/** The homepage book cover from the `siteSettings` singleton, or null if unset. */
export const getSiteCover = cache(async (): Promise<ResolvedImage | null> => {
  const cover = await sanityClient.fetch<RawImage>(
    `*[_id == "siteSettings"][0].cover`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  const resolved = resolve(cover);
  if (!resolved) return null;
  return { source: resolved.source, alt: resolved.alt || 'The Dominion Realm' };
});

/** The default social/OG image from the `siteSettings` singleton, or null if
 *  unset — the call site then falls back to the static `public/og-default.png`. */
export const getSocialImage = cache(async (): Promise<ResolvedImage | null> => {
  const social = await sanityClient.fetch<RawImage>(
    `*[_id == "siteSettings"][0].socialImage`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  return resolve(social);
});

/**
 * Primary images for every non-draft Subject, keyed by `${kind}:${slug}` — the
 * join back to the git codex entry. A Subject with no Primary asset is simply
 * absent, so the call site falls back to its git image.
 */
export const getSubjectPrimaryMap = cache(async (): Promise<Map<string, ResolvedImage>> => {
  const rows = await sanityClient.fetch<
    Array<{ kind: string | null; slug: string | null; primary: RawImage }>
  >(
    `*[_type == "subject" && defined(primary.asset) && !(_id in path("drafts.**"))]{
      kind, "slug": slug.current, primary
    }`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  const map = new Map<string, ResolvedImage>();
  for (const r of rows) {
    const resolved = resolve(r.primary);
    if (r.kind && r.slug && resolved) map.set(`${r.kind}:${r.slug}`, resolved);
  }
  return map;
});

/**
 * Full media for one Subject (primary + gallery + type slots), or null when no
 * Subject exists for that `kind`/`slug`. Empty slots resolve to null / an empty
 * gallery, so a call site renders only what's present.
 */
export const getSubjectMedia = cache(
  async (kind: SubjectKind, slug: string): Promise<SubjectMedia | null> => {
    const doc = await sanityClient.fetch<{
      primary: RawImage;
      gallery: RawImage[] | null;
      banner: RawImage;
      map: RawImage;
      sigil: RawImage;
    } | null>(
      `*[_type == "subject" && kind == $kind && slug.current == $slug && !(_id in path("drafts.**"))][0]{
        primary, gallery, banner, map, sigil
      }`,
      { kind, slug },
      { next: { tags: [SANITY_TAG] } },
    );
    if (!doc) return null;
    return {
      primary: resolve(doc.primary),
      banner: resolve(doc.banner),
      map: resolve(doc.map),
      sigil: resolve(doc.sigil),
      gallery: (doc.gallery ?? []).flatMap((g) => {
        const r = resolve(g);
        return r ? [{ ...r, caption: (g as { caption?: string })?.caption ?? '' }] : [];
      }),
    };
  },
);

/** Map a git codex collection to its Sanity `Subject.kind` (for detail pages). */
export function subjectKindFor(collection: CodexCollection): SubjectKind {
  return COLLECTION_KIND[collection];
}
