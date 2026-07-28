import 'server-only';
import { cache } from 'react';
import { sanityClient } from './client';
import type { SanityImageSource } from './image';
import type { CodexCollection } from '@/lib/content';
import type { SubjectKind } from './slotMap';
import { COLLECTION_KIND, subjectKindFor } from './collectionKind';
import { SCENE_BEATS, type SceneBeat } from './sceneJoins';

export { subjectKindFor };
export type { SceneBeat };

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

/** The published-only GROQ guard, interpolated into every read so draft docs
 *  never leak to production. One home instead of the same clause hand-copied
 *  into each query (forget it once and unpublished art ships). */
const PUBLISHED_FILTER = '!(_id in path("drafts.**"))';

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

/**
 * The `kind:slug` join key from the Sanity/PRODUCER side, where a GROQ row already
 * carries `kind` (the `Subject.kind` field). `kind` disambiguates cross-collection
 * slug collisions. One format, two doors: use this where you hold a `kind`, and
 * `subjectKey` where you hold a git `collection`.
 */
export function subjectKeyForKind(kind: string, slug: string): string {
  return `${kind}:${slug}`;
}

/**
 * The `kind:slug` key from the git/CONSUMER side — maps the codex `collection` to
 * its Sanity `kind` via `COLLECTION_KIND`, so a caller holding a collection never
 * has to spell the kind literal (which is what `page.tsx` used to do).
 */
export function subjectKey(collection: CodexCollection, slug: string): string {
  return subjectKeyForKind(COLLECTION_KIND[collection], slug);
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

/** Resolve a raw GROQ gallery array into ordered {@link GalleryImage}s: each raw
 *  image is resolved, assetless items are dropped, and the optional caption is
 *  attached (defaulting to `''`). The single home for the resolve+caption+drop
 *  flatMap that `getSubjectMedia`, `getSceneMedia`, and `getSceneMediaMap` share.
 *  Any per-row dedup guard stays in the caller — this covers only the flatMap. */
function resolveGallery(items: RawImage[] | null | undefined): GalleryImage[] {
  return (items ?? []).flatMap((g) => {
    const r = resolve(g);
    return r ? [{ ...r, caption: (g as { caption?: string })?.caption ?? '' }] : [];
  });
}

/** Build a `${kind}:${slug}` → ResolvedImage map from GROQ subject rows: resolve
 *  the picked image field, and key it only when kind, slug, and a resolved image
 *  are all present (an unresolved/keyless row is skipped so the call site falls
 *  back to git). `pick` selects the row's image field, the only thing the primary
 *  and card maps differ by. */
function buildSubjectMap<R extends { kind: string | null; slug: string | null }>(
  rows: R[],
  pick: (row: R) => RawImage,
): Map<string, ResolvedImage> {
  const map = new Map<string, ResolvedImage>();
  for (const r of rows) {
    const resolved = resolve(pick(r));
    if (r.kind && r.slug && resolved) map.set(subjectKeyForKind(r.kind, r.slug), resolved);
  }
  return map;
}

/** A tagged decision for which media rung a Subject surface should render:
 *  the Sanity source (with its resolved alt), the git `/content-media` src (with
 *  its resolved alt), or nothing. It owns the Sanity → git → terminal rung choice
 *  and the alt precedence; each call site still renders its own components and
 *  terminal (a placeholder, an anchored git image, or null). */
export type SubjectMediaDescriptor =
  | { kind: 'sanity'; source: SanityImageSource; alt: string }
  | { kind: 'git'; src: string; alt: string }
  | { kind: 'none' };

/**
 * Alt precedence for a Sanity-sourced Subject image: the authored alt when it
 * says something, otherwise the surface's fallback.
 *
 * Deliberately `||`, not `??` — an authored-but-empty Sanity alt means "nobody
 * filled this in", so it falls back. The git rung is the opposite case and keeps
 * `imageAlt ?? name`: an explicitly empty frontmatter alt marks a decorative
 * image and must survive. Do not "unify" the two operators; they encode
 * different intents.
 */
export function subjectAlt(image: { alt: string } | null | undefined, fallback: string): string {
  return image?.alt || fallback;
}

/** Pick the media rung + alt for a Subject surface, extracting the 3-rung ladder
 *  (Sanity source → git image → terminal) that was hand-inlined per surface.
 *
 *  - `sanity` present → the Sanity rung, alt = `sanity.alt || name`.
 *  - else git `src` present → the git rung, alt = `imageAlt ?? name`.
 *  - else → `none` (the caller renders its own terminal).
 *
 *  The descriptor decides the rung and alt only; the caller keeps its bespoke
 *  rendering and terminal (SubjectGallery vs a single image, placeholder vs null). */
export function resolveSubjectMedia(input: {
  sanity: ResolvedImage | null | undefined;
  git: string | null | undefined;
  name: string;
  imageAlt?: string | null;
}): SubjectMediaDescriptor {
  if (input.sanity) {
    return {
      kind: 'sanity',
      source: input.sanity.source,
      alt: subjectAlt(input.sanity, input.name),
    };
  }
  if (input.git) {
    return { kind: 'git', src: input.git, alt: input.imageAlt ?? input.name };
  }
  return { kind: 'none' };
}

/**
 * The homepage book cover from the `siteSettings` singleton, or null if unset —
 * the call site then falls back to the code-owned `FALLBACK_COVER` static asset.
 * Soft-fails to null on a Sanity error too (a fetch reject would otherwise 500
 * the homepage): the cover is not worth taking the marketing page down for, and
 * a committed fallback exists (audit CAND-19).
 */
export const getSiteCover = cache(async (): Promise<ResolvedImage | null> => {
  let cover: RawImage;
  try {
    cover = await sanityClient.fetch<RawImage>(
      `*[_id == "siteSettings"][0].cover`,
      {},
      { next: { tags: [SANITY_TAG] } },
    );
  } catch (err) {
    console.warn('[media] getSiteCover: Sanity fetch failed, using static fallback', err);
    return null;
  }
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
    `*[_type == "subject" && defined(primary.asset) && ${PUBLISHED_FILTER}]{
      kind, "slug": slug.current, primary
    }`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  return buildSubjectMap(rows, (r) => r.primary);
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
    `*[_type == "subject" && defined(coalesce(card.asset, primary.asset)) && ${PUBLISHED_FILTER}]{
      kind, "slug": slug.current, "image": coalesce(card, primary)
    }`,
    {},
    { next: { tags: [SANITY_TAG] } },
  );
  return buildSubjectMap(rows, (r) => r.image);
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
      `*[_type == "subject" && kind == $kind && slug.current == $slug && ${PUBLISHED_FILTER}][0]{
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
      gallery: resolveGallery(doc.gallery),
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
      `*[_type == "scene" && beat == $beat && beatRef == $beatRef && ${PUBLISHED_FILTER}][0]{
        images
      }`,
      { beat, beatRef },
      { next: { tags: [SANITY_TAG] } },
    );
    if (!doc) return null;
    const images = resolveGallery(doc.images);
    return images.length ? { images } : null;
  },
);

/** One requested Scene join: the beat kind plus the git `beatRef` to look up. */
export interface SceneBeatKey {
  beat: SceneBeat;
  beatRef: string;
}

/** The `${beat}:${beatRef}` key a {@link getSceneMediaMap} row is stored under —
 *  the beat kind is part of the key because a chapter and an Event can share a
 *  slug, so the call site reads back with the same `(beat, beatRef)` it asked for. */
export function sceneKey(beat: SceneBeat, beatRef: string): string {
  return `${beat}:${beatRef}`;
}

/**
 * Scene art for many beats at once, keyed by `${beat}:${beatRef}` — the batched
 * counterpart to {@link getSceneMedia}, modelled on {@link getSubjectPrimaryMap}.
 *
 * The requested keys are grouped by beat *kind* and each kind is fetched in a
 * single `beatRef in [...]` query, so a page listing N beats of one kind issues
 * ONE Sanity read, not N (the N+1 the timeline page used to fan out — including
 * for sealed beats). {@link SCENE_BEATS} is the single source of truth for which
 * kinds exist, so a new beat kind is batched automatically. A beat with no
 * non-draft Scene (or a Scene with no usable images) is simply absent from the
 * map, so the call site falls back to the git hero, then nothing.
 */
export const getSceneMediaMap = cache(
  async (keys: readonly SceneBeatKey[]): Promise<Map<string, SceneMedia>> => {
    const map = new Map<string, SceneMedia>();
    for (const beat of SCENE_BEATS) {
      const beatRefs = keys.filter((k) => k.beat === beat).map((k) => k.beatRef);
      if (beatRefs.length === 0) continue;
      const rows = await sanityClient.fetch<
        Array<{ beatRef: string | null; images: RawImage[] | null }>
      >(
        `*[_type == "scene" && beat == $beat && beatRef in $beatRefs && ${PUBLISHED_FILTER}]{
          beatRef, images
        }`,
        { beat, beatRefs },
        { next: { tags: [SANITY_TAG] } },
      );
      for (const r of rows) {
        if (!r.beatRef || map.has(sceneKey(beat, r.beatRef))) continue;
        const images = resolveGallery(r.images);
        if (images.length) map.set(sceneKey(beat, r.beatRef), { images });
      }
    }
    return map;
  },
);
