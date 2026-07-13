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

/** A public artist credit lifted off an Asset. Private licence notes are never
 *  part of this — see `resolve`. */
export interface Credit {
  /** Artist name, shown as “Art by NAME”. */
  name: string;
  /** Optional validated URL — renders the name as a safe outbound link. */
  url?: string;
}

/** A resolved Sanity image: its source (for `urlFor`), alt text, and public credit. */
export interface ResolvedImage {
  source: SanityImageSource;
  alt: string;
  /** Public artist credit, or null. Private licence notes never travel here. */
  credit: Credit | null;
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

/** Which kind of story beat a Scene binds to — matches the `scene.beat` enum. */
export type SceneBeat = 'reading' | 'timeline';

/** Art bound to a story beat (a reading chapter or a timeline Event): an ordered
 *  gallery whose first image is the beat's hero plate. */
export interface SceneMedia {
  images: GalleryImage[];
}

/** A raw Sanity image field as returned by GROQ (asset ref + optional meta).
 *  `license` is fetched server-side but deliberately dropped in `resolve`. */
type RawImage =
  | (SanityImageSource & {
      alt?: string;
      caption?: string;
      credit?: string;
      creditUrl?: string;
      license?: string;
      hotspot?: unknown;
      crop?: unknown;
    })
  | null
  | undefined;

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

/** Coerce a raw GROQ image field into a ResolvedImage, or null when unset.
 *
 *  `source` is trimmed to exactly what `urlFor` needs (asset + focal point), so a
 *  private field — notably `license` — can never cross the server→client boundary
 *  by riding along inside the image object. The public `credit` is lifted out
 *  separately; a blank credit name resolves to null (and a `creditUrl` without a
 *  name is ignored, per the PRD). */
function resolve(img: RawImage): ResolvedImage | null {
  if (!img || typeof img !== 'object' || !('asset' in img) || !img.asset) return null;
  const source = {
    _type: 'image',
    asset: img.asset,
    hotspot: img.hotspot,
    crop: img.crop,
  } as SanityImageSource;
  const name = typeof img.credit === 'string' ? img.credit.trim() : '';
  const url = typeof img.creditUrl === 'string' ? img.creditUrl.trim() : '';
  return {
    source,
    alt: img.alt ?? '',
    credit: name ? { name, ...(url ? { url } : {}) } : null,
  };
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
  return { ...resolved, alt: resolved.alt || 'The Dominion Realm' };
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

/** The `/map` page artwork from the `siteSettings` singleton, or null if unset —
 *  the page then falls back to the generated interactive ley-line diagram. */
export const getRealmMap = cache(async (): Promise<ResolvedImage | null> => {
  const map = await sanityClient.fetch<RawImage>(
    `*[_id == "siteSettings"][0].realmMap`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  return resolve(map);
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
 * Homepage cast-card images for every non-draft Subject, keyed by `${kind}:${slug}`.
 * Prefers the dedicated `card` slot and coalesces to `primary` when it's unset, so
 * the homepage "Dramatis Personae" cards can differ from the Codex (which reads
 * `primary` directly) yet degrade to the same portrait until a card is uploaded.
 * A Subject with neither asset is absent, so the call site falls back to its git
 * image (Sanity → git → placeholder).
 */
export const getSubjectCardMap = cache(async (): Promise<Map<string, ResolvedImage>> => {
  const rows = await sanityClient.fetch<
    Array<{ kind: string | null; slug: string | null; image: RawImage }>
  >(
    `*[_type == "subject" && defined(coalesce(card.asset, primary.asset)) && !(_id in path("drafts.**"))]{
      kind, "slug": slug.current, "image": coalesce(card, primary)
    }`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  const map = new Map<string, ResolvedImage>();
  for (const r of rows) {
    const resolved = resolve(r.image);
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

/**
 * Scene art for one story beat, keyed by `beat` + `beatRef` (the git filename
 * slug of the chapter or timeline Event this art illustrates). Returns the
 * ordered gallery, or null when no non-draft Scene matches or it has no images —
 * so the call site falls back to the git hero, then nothing (Sanity → git →
 * placeholder). The `beat` filter matters: a chapter and an Event can share a
 * slug, and only the right kind of beat should claim the art.
 *
 * The join is intentionally unvalidated (CONTEXT.md § Scene art): a `beatRef`
 * that matches no beat simply renders nothing, and nothing is auto-deleted.
 */
export const getSceneMedia = cache(
  async (beat: SceneBeat, beatRef: string): Promise<SceneMedia | null> => {
    const doc = await sanityClient.fetch<{ images: RawImage[] | null } | null>(
      `*[_type == "scene" && beat == $beat && beatRef == $beatRef && !(_id in path("drafts.**"))][0]{
        images
      }`,
      { beat, beatRef },
      { next: { tags: [SANITY_TAG] } },
    );
    if (!doc) return null;
    const images = (doc.images ?? []).flatMap((g) => {
      const r = resolve(g);
      return r ? [{ ...r, caption: (g as { caption?: string })?.caption ?? '' }] : [];
    });
    return images.length ? { images } : null;
  },
);

/** Map a git codex collection to its Sanity `Subject.kind` (for detail pages). */
export function subjectKindFor(collection: CodexCollection): SubjectKind {
  return COLLECTION_KIND[collection];
}
