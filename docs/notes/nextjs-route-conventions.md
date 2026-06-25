# Patch note — Next.js route/chrome/link/image conventions pass

A follow-up pass making the app-route/page layer use Next.js conventions more
consistently. No behavior, URL, content, or reveal-tier semantics changed; all
gates green (`tsc`, `next build`, 84 tests, prettier).

## Files changed

**New shared components**

- `src/components/CodexChrome.tsx` — extracted codex-family chrome (overlays, top
  bar, cross nav via `next/link`, `RevealToggle`, footer).
- `src/components/ContentImage.tsx` — single seam for codex/reading content art.

**Chrome consolidated onto the shared components**

- `src/app/codex/layout.tsx` — now delegates to `CodexChrome`.
- `src/components/journal/JournalChrome.tsx` — now delegates to `CodexChrome`
  (+ keeps the journal stylesheet).
- `src/app/relationships/page.tsx` — dropped its hand-duplicated codex chrome
  (overlays/top nav/`RevealToggle`/footer) and now wraps content in `CodexChrome`.
- `src/app/map/page.tsx` — dropped its hand-duplicated reading shell and now
  wraps content in `ReadingChrome`.
- `src/components/reading/ReadingChrome.tsx` — nav converted to `next/link`.

**Internal navigation → `next/link`**

- `CodexChrome`, `ReadingChrome`, `CodexCard`, `SearchBox`, `codex/page.tsx`,
  `codex/[collection]/[id]/page.tsx`, `read/page.tsx`, `read/[id]/page.tsx`,
  `map/page.tsx`, `relationships/page.tsx`.

**Content images → `ContentImage`**

- `CodexCard`, `codex/[collection]/[id]/page.tsx`, `read/page.tsx`,
  `read/[id]/page.tsx`.

## Why each category changed

- **Shared chrome:** `CodexLayout`, `JournalChrome`, and `relationships/page` had
  three byte-identical copies of the codex shell; `map/page` re-implemented the
  reading shell. Consolidating removes the duplication and gives one place to
  change nav/footer.
- **`next/link`:** client-side navigation + prefetch for internal routes, and
  consistency across the route layer.
- **`ContentImage`:** centralizes the four raw `<img>` sites (and their
  `eslint-disable`) behind one component that can optimize via `next/image` the
  moment dimensions are available.

## Raw `<img>` / `<a>` intentionally left in place

- **`ContentImage` still renders a raw `<img>` today** — see below.
- **Full-size image link** on the codex entry page stays a plain `<a target="_blank">`
  (opens the raw asset in a new tab; not an internal route).
- **SVG `<a>` marks** in the map and the constellation node links stay raw SVG
  anchors — `next/link` is not valid inside `<svg>`.
- **Download links** (`/read` EPUB/PDF) stay raw `<a download>`; **`rss.xml`** and
  same-page hash links stay raw.
- **Out of this brief's Task-1 scope:** `src/app/page.tsx` (homepage),
  `about`, `eyes`, `interface`, and the journal detail/list pages still use raw
  internal `<a>`. Left untouched to honor the brief's enumerated file list — a
  reasonable follow-up if full-site `next/link` consistency is wanted.

## Where `next/image` was not feasible

Codex/reading art arrives from the content loader as `/content-media/...` paths
with **no intrinsic dimensions**, and the per-figure CSS doesn't establish a
sized/relative container for `fill`. `next/image` needs known `width`+`height`
(or `fill` over such a container), so `ContentImage` renders a raw `<img>` until
dimensions exist, and switches to `next/image` automatically when `width`+`height`
are passed. Upgrade path: record image dimensions in the loader or as optional
frontmatter — no call-site change required.
