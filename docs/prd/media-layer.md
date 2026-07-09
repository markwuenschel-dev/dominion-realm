# PRD — The Dominion Realm: Media Layer

> PRD for moving images out of git into a hosted media layer. The core
> architectural decision is recorded in [ADR-0011](../adr/0011-media-layer-sanity.md);
> the domain vocabulary (Subject, Asset, Primary image, Gallery, Type slot, Scene
> art) lives in [`CONTEXT.md`](../../CONTEXT.md#media). No issue tracker is
> configured, so this PRD lives as a file. Reached via a grill-with-docs session,
> 2026-07-07.

## Problem Statement

Images currently live in git as committed binaries, referenced by hand-written
`/content-media/...` paths in Markdown frontmatter and copied into `public/` by a
prebuild step. That model has failed on four fronts at once, all confirmed by the
author:

1. **Hand-edited paths break.** Frontmatter paths and file-name casing drift out of
   sync (e.g. the recent Illyristranthe casing fixes). It is fiddly and error-prone.
2. **Every change is a full redeploy.** Swapping one picture means a git commit and
   a Railway rebuild of the whole site — slow feedback for a visual edit.
3. **The browser editor isn't usable.** Point-click-upload from any device isn't a
   working reality today.
4. **One image per entity is too few.** Each entry has a single `image` slot; there
   is no gallery, no map, no sigil, no scene art.

Meanwhile the site is meant to grow into **the entire Dominion Realm universe** —
not just more characters, but whole new *kinds* of thing (items, creatures, events,
powers, combat systems, and kinds not yet named). The current per-collection,
one-slot, git-baked model does not scale to that.

## Solution

Split media from prose. **Prose stays exactly where it is** — git Markdown edited in
Keystatic, with reveal-gating and search untouched. **Media moves to Sanity**, a
hosted CMS used purely as the picture layer, delivered through its image CDN. The
author uploads in Sanity's browser Studio and the change goes **live in seconds —
no commit, no redeploy.**

Pictures attach to a **type-agnostic Subject** (open `kind` label) so a new kind of
thing never re-plumbs pictures — the direct answer to "scalable for the whole
universe." Each Subject gets a **Primary image** (focal-point auto-cropped into
card / portrait / detail from one upload), an ordered **Gallery** (caption + alt
each), kind-specific **Type slots** (Map / Sigil / Banner), and **Scene art** bound
to a chapter or timeline Event. Every Asset carries required alt text and optional
artist credit. Prose and media are joined by **slug, matched automatically** by a
sync so the author never types a slug — removing the entire class of casing bugs.

Folded into the same work: per-page **social/share (OG) images** (none exist
today), an **owned backup** export of all media, and the homepage **book cover**
managed the same way as everything else instead of as a one-off.

## User Stories

**Author (managing pictures)**

1. As the author, I want to upload or replace a picture in a browser from any device and see it live in seconds, so that changing art doesn't mean a commit and a redeploy.
2. As the author, I never want to type a file path or slug, so that casing/path mistakes can't break an image again.
3. As the author, I want each thing to have one Primary image that looks right on its card, its portrait, and its detail page from a single upload, so that I don't hand-crop three versions.
4. As the author, I want to add unlimited extra images to a thing as an ordered gallery with captions and alt text, so that a character/place/item can show more than one picture.
5. As the author, I want kind-specific slots — a Map on a Place, a Sigil on a Faction, a wide Banner — so that different kinds of thing get the pictures that suit them.
6. As the author, I want to attach scene art to a chapter or a timeline moment, so that story beats can be illustrated, not just entities.
7. As the author, I want a brand-new *kind* of thing (an Item, a Combat System, something I invent later) to get all the same picture slots with no rebuild of the picture system, so that the universe can grow without re-engineering.
8. As the author, I want a new thing's pictures to be waiting for me in Sanity the moment I write its words in Keystatic, matched by name automatically, so that the two halves never drift apart.
9. As the author, I want to record who made each image and its licence right next to it, so that attribution and rights travel with the art.
10. As the author, I want a full copy of every image and label exported somewhere I control, so that I can never be locked out of my own universe.

**Reader / visitor**

11. As a visitor, I want portraits, galleries, maps, and sigils to load fast and sharp on any screen, so that the world feels crafted.
12. As a sharer, I want a link to any thing to show that thing's picture as the preview, so that shared links look great.
13. As a visitor on a slow or blocked connection, I want a graceful placeholder when a picture is missing, so that pages never look broken.

**Continuity**

14. As the author, I want the live site to keep working throughout the migration, so that moving pictures never takes the site down.

## Implementation Decisions

- **Boundary:** prose = git/Keystatic (unchanged); media (binaries + associations)
  = Sanity. Scoped reversal of ADR-0002 / ADR-0009 for the media slice only. See
  ADR-0011.
- **Platform:** Sanity, hosted, used as media-only. Free tier at this scale. Studio
  is the author's browser editor; delivery via Sanity's image CDN (auto webp/avif,
  focal-point crop).
- **Join key:** slug. A sync upserts a Subject per git entry (matched by slug) so
  the author never types one. Missing-Subject and missing-Asset both fall back
  gracefully.
- **Type-agnostic Subject:** one Sanity document type with an open `kind` label;
  new kinds need no schema change to the picture layer.
- **Media model per Subject:** Primary, Gallery (ordered, caption + alt), Type slots
  (Map / Sigil / Banner), plus a Scene document binding Assets to a chapter or
  timeline Event. Every Asset: required alt, optional artist credit + licence.
- **Live updates:** a Sanity change webhook triggers Next.js on-demand revalidation
  of just the affected page(s) — no full redeploy.
- **Fallback during migration:** the image resolver reads Sanity first, then the
  existing git image, then the monogram placeholder, so nothing breaks mid-move.
- **Editor/auth:** solo author, via Google/GitHub login to Sanity. Collaborators
  later if ever needed.
- **Studio location:** the editor is embedded in the Next app at **`/studio`**
  (own domain, mirrors Keystatic at `/keystatic`), not a hosted `sanity.studio` URL.
- **Slot tailoring:** storage is one generic Subject, but the Studio *shows* only
  the slots relevant to a kind, via a small **slot map**. Defaults:
  Character/Item → Primary + Gallery + Banner; Place → + Map; Faction → + Sigil. A
  new kind gets Primary + Gallery + Banner until the map says otherwise — so a new
  kind still needs zero schema change.
- **Delete safety:** deletes are never mirrored; a Subject whose prose is gone
  becomes an **orphaned Subject** (Assets kept, flagged for manual review). See
  CONTEXT.md.
- **Resolver order:** Sanity → existing git image → monogram placeholder. Never a
  broken image.
- **Gallery UX:** thumbnail grid → click opens a lightbox with caption and
  keyboard navigation.
- **Backups:** nightly export of all Assets + labels committed to a **private
  GitHub repo** the author owns (versioned; roll back to any snapshot).
- **Social images:** the Primary, CDN-cropped to 1200×630, as each route's OG
  image; a default site image when a Subject has no Primary. A branded card is a
  later polish, out of scope for v1.
- **Folded in:** per-page OG images from the Primary; homepage cover as a Subject/
  singleton in the same system; automated backup export.

### Phasing (build order)

0. **Sanity account (author, ~10 min, guided).** Free account + project; the one
   manual, uncommitted step (mirrors the ADR-0009 Keystatic checklist).
1. **Schema + Studio.** The type-agnostic Subject (Primary / Gallery / Type slots /
   credit + alt), the Scene document, the cover, and the per-kind slot map — served
   through the embedded Studio at `/studio`.
2. **Seed & migrate.** One-way sync (prose → Subject by slug) with orphan-flagging,
   never auto-delete; move the 7 character portraits + `cover.png` into Sanity;
   verify each renders.
3. **Wire the site. — DONE (2026-07-08).** Cast cards, codex cards, detail pages,
   and the home hero read Sanity (hotspot focal-point crop via `@sanity/image-url`,
   rendered through `next/image` in `SubjectImage`) behind the git fallback; the
   gallery grid + keyboard lightbox and per-kind type-slot rendering (banner / map /
   sigil) ship in `SubjectGallery`; the `/api/revalidate` webhook busts the coarse
   `sanity` cache tag (signature-verified). Read seam generalized to a type-agnostic
   `getSubjectPrimaryMap()` + `getSubjectMedia(kind, slug)` (`kind:slug` join). The
   sync script now seeds Subjects for all four collections. The backbone everything
   else references.

   **Operator steps (one-time, not code):** run
   `node --env-file=.env scripts/sanity-migrate.mjs` to seed the Subjects; set
   `SANITY_REVALIDATE_SECRET` in Railway; add a Sanity **webhook** (dashboard →
   API → Webhooks) `POST`ing to `https://<site>/api/revalidate` on
   Subject/siteSettings changes, with that same value as its **signing secret**.
4. **Folded-in gaps.** Per-page OG images (bare Primary, cropped), 'Art by —' credit
   display, and the nightly backup export to a private repo.
5. **Cleanup.** Retire `scripts/copy-content-media.mjs` and the gitignored
   `public/content-media/` for migrated collections; delete the stale
   `images_aspect_ratio.md`; keep git portraits as a fallback through a confidence
   window, then remove them in a follow-up commit (the backup repo retains copies).

### Effort

A **medium project** — a handful of focused sessions, bounded by the existing image
seam (`resolveImage`, `ContentImage`, `MediaPlaceholder`, `getHomeSettings`), which
localizes most Phase-3 changes to swapping what feeds those chokepoints.

- **~700–1,000 lines of maintained code** (Phases 3–4) across ~10–15 mostly-small
  file edits.
- **~300–500 lines of run-once migration/sync scripts** (Phase 2), largely retired
  after.
- **~200–400 lines of tests** (fallback chain, slug join, revalidation smoke).
- **4 new dependencies:** `sanity`, `@sanity/client`, `@sanity/image-url`,
  `next-sanity`.
- **Cost driver to watch:** the estimate holds only while the model stays
  type-agnostic; per-kind bespoke picture logic would balloon it. Guard the generic
  Subject in review.

## Testing Decisions

Assert externally observable behavior, not Sanity internals.

- **Fallback chain (highest value):** a Subject with a Sanity Primary renders it; a
  Subject with none falls back to the git image; a Subject with neither renders the
  monogram placeholder — never a broken image or a 404.
- **Slug join:** a git entry and its Sanity Subject resolve to each other by slug;
  a mismatch degrades to fallback rather than crashing a page.
- **Live update:** publishing an image in Sanity revalidates the affected page
  without a redeploy (integration/smoke against the webhook).
- **Build integrity:** `next build` passes with the new resolver; the server-only
  boundary is respected (Sanity reads stay server-side).
- **Social images:** each entity/detail route emits an OG image tag pointing at its
  Primary (or a sensible default when absent).
- **A11y:** alt text is required on every Asset; a missing alt is caught before it
  ships.

## Out of Scope

- **Moving prose to Sanity.** Canon stays in git (reveal-gating, search indexing,
  Realmwalkers link). Explicitly not in scope — see ADR-0011.
- **A single unified editor** for words + pictures. Recorded as a possible future
  direction only; two editors (Keystatic + Sanity) is the accepted state now.
- **Interactive world map.** Places can get a Map slot here, but the map experience
  itself remains backlog (per the site-overhaul PRD).
- **Collaborator/multi-editor workflows, roles, approvals.** Solo author for now.
- **Retiring Keystatic or the git content model.** Unchanged by this work.

## Further Notes

- **Vocabulary is canon:** Subject / Asset / Primary image / Gallery / Type slot /
  Scene art are ubiquitous language — keep them consistent across the Sanity schema,
  the code, and any copy. See `CONTEXT.md`.
- **Type-agnostic is the scalability bet:** the whole "entire universe" ask rests on
  a new *kind* of thing needing zero picture-layer changes. Guard that property in
  review — resist adding per-kind picture plumbing.
- **Ownership guardrail:** media on a SaaS is acceptable only with the automated,
  author-owned backup (Phase 4). Treat that as part of the deal, not a nice-to-have.
- **Migrate behind the fallback:** every phase ships with the git fallback intact so
  the live site never goes dark during the move.
