# Scene art binds to whole beats by filename slug, rendered as an opening plate

Status: accepted. The Sanity `scene` schema (ADR-0011) shipped dormant — defined
and editable in Studio, read by nothing. This wires it into the reading
experience and fixes the contract it binds by, closing a decision the schema left
open: what a "scene" is scoped to, how it joins back to git, and where it renders.

## Decision

- **Beat-scoped, not sub-scene-scoped.** Despite the name, Scene art binds to a
  whole reading Chapter (or a timeline Event), addressed by that beat's git
  **filename slug** (`beatRef`) — the same id its URL uses. It does **not** carry
  a scene index into a chapter. A chapter now paginates into scene-pages at its
  thematic breaks, and a per-scene index would silently drift the moment an author
  inserts or removes a break; a chapter id is stable. If a specific mid-chapter
  moment ever needs its own art, that is a later, additive `part` field, defaulting
  to whole-chapter.
- **Unvalidated, one-way join (prose → media),** mirroring Subjects. A `beatRef`
  matching no beat simply renders nothing, and no Asset is auto-deleted on a
  words-side rename. With a sole editor and a handful of chapters, a typo is
  self-evident (the art does not appear) and a five-second fix; a synced Studio
  dropdown or a CI cross-check buys little at this scale. The Studio field
  description names the exact slug format instead.
- **Opening plate, part 1 only.** The beat's first image renders once, as a wide
  (16:9) hero at the top of the chapter's first page — the least disruptive,
  most conventional spot for illustration in immersive prose. Later scene-pages
  show nothing. Extra images open the shared Phase 3 Lightbox behind one
  affordance; a single-image chapter is just a plate.
- **Sanity → git → nothing.** The plate supersedes the chapter's existing git
  `image` hero when a Scene exists, and falls back to it (then to nothing) when
  it does not — the same precedence the rest of the media layer follows.
- **The plate feeds OG.** The hero also becomes the chapter's social-preview
  image (reusing the Phase 4 `og.ts` crop), falling back to the default. Reading
  is ungated, so there is no reveal-tier leak surface: a chapter with a page is
  already public, and its illustration is no more sensitive than its prose.
- **Reading only this pass.** Timeline reuses the same `getSceneMedia(beat, ref)`
  reader as a fast-follow; the reader already filters on `beat` so a chapter and
  an Event that share a slug never claim each other's art.

## Consequences

The schema stops being dead weight without a migration: the `scene` document and
its `beat`/`beatRef`/`images` fields are exactly what the reader consumes. The
"scene art" name now over-promises — it reads as sub-scene but is chapter-scoped
— which the glossary calls out explicitly (CONTEXT.md § Scene art, § Plate) so a
future reader is not surprised.

The unvalidated join is a deliberate, revisitable trade: it fails silently rather
than loudly. If chapters ever number in the dozens, a `scene:check` script or a
git-synced Studio input becomes worth its weight; until then the field
description carries the contract. The `/read` index shows no thumbnails — art is
detail-page only — so selling chapters at the list level, if wanted, is a later
map-reader plus a card-layout decision, not part of this pass.
