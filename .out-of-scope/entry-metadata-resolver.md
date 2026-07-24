# Rejected candidate: entry-metadata-resolver

**Date:** 2026-07-24
**Source:** architecture-review flywheel (Wave 3 scoping pass)
**Disposition:** DROPPED as a distinct candidate — its live substance is absorbed by
`subject-media-resolver`.

## The proposed candidate
"Codex/entry metadata (title, subtitle, media, fields) is resolved in multiple places and
should go through one `resolveEntryMetadata(entry)`."

## Why it was rejected as its own slice
Read-only scoping found the entry-metadata concerns are **already centralized**:

- Subtitle/kicker — already one seam: `entryKicker(entry)` (`src/lib/codex.ts:105`),
  consumed by both the card and the page. No duplication.
- Dossier fields — already one seam: `dossierFields(entry)`. No duplication.
- Title — a bare field read (`entry.data.name`), identical across codex surfaces; no ladder.
- OG social image — already behind `previewMetadata` / `entrySocialImage` (`src/sanity/og.ts`).

The **only** live duplication is the image-alt fallback (`?? name` vs `|| sanity.alt`) and the
Sanity→git→placeholder media ladder — which **is** the `subject-media-resolver` candidate.
A standalone `resolveEntryMetadata` would mostly re-wrap existing resolvers for little gain.

## Disposition
Fold the live media-ladder/alt duplication into `subject-media-resolver` (which owns the
cross-surface media primitive). If, after that lands, a thin entry-page **orchestration** layer
proves useful, it can be reconsidered — but it would consume the media resolver, not duplicate it.

**Trap noted for the media-resolver work:** per-surface terminals are deliberate — the entry
page ends its ladder in `null` (with a full-size anchor), cards/homepage in `MediaPlaceholder`,
and the homepage reads a different Sanity slot (`getSubjectCardMap`). A resolver must return a
descriptor and leave rendering per-surface, or it will regress the layout.
