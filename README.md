<div align="center">

# The Dominion Realm

**The official showcase site and living world codex for _The Dominion Realm_**
_Realmwalkers · Book One — an interface-fantasy novel_

A man wakes in a world that isn't Earth, in a body his implant insists on
translating into a game. The site lets readers explore that world — and reads it
back to them through a spoiler-aware lens that never reveals more than they've
earned.

[![CI](https://github.com/markwuenschel-dev/dominion-realm/actions/workflows/ci.yml/badge.svg)](https://github.com/markwuenschel-dev/dominion-realm/actions/workflows/ci.yml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node ≥22](https://img.shields.io/badge/Node-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](LICENSE.md)

</div>

---

## Overview

The Dominion Realm is a content-driven marketing and world-bible site built on
the **Next.js App Router**. The novel's canon lives as version-controlled
Markdown; the site renders it as a browsable codex, a free reading sample, an
author journal, and interactive maps — all governed by a four-tier spoiler model
so a first-time visitor and a finished-the-book reader see different depths of
the same page.

Authors edit in the browser through an embedded **Keystatic** CMS that commits
straight back to the repository, so there is no database to operate and every
change is an ordinary Git commit.

## Features

| Area | What it does |
| --- | --- |
| **World Codex** | Characters, concepts, factions, and places — typed, cross-linked, and spoiler-gated |
| **Reveal model** | Four cumulative tiers (`teaser → reader → deep → beyond`); a global toggle unseals deeper lore (ADR-0004) |
| **Reading sample** | Prologue + Chapter One in full, with generated **EPUB & PDF** downloads |
| **Interactive map** | The Realm's ley-line cartography with reveal-gated, codex-linked place markers |
| **Constellation** | The whole codex drawn as a relationship graph |
| **Author journal** | Field notes and desk essays as MDX |
| **Browser CMS** | Keystatic admin at `/keystatic`, committing to Git via GitHub OAuth (ADR-0009) |
| **Search** | Client-side MiniSearch over a spoiler-safe corpus (no gated text is ever indexed) |
| **Growth** | Newsletter capture, GA4 analytics, RSS feed, and a configurable buy / pre-order CTA |

## Tech stack

- **[Next.js 15](https://nextjs.org)** (App Router, React Server Components) · **[React 19](https://react.dev)** · **[TypeScript](https://www.typescriptlang.org)**
- **Content** — Markdown/MDX validated at build time with **[Zod](https://zod.dev)** schemas (`src/lib/content.ts`)
- **CMS** — **[Keystatic](https://keystatic.com)** in GitHub storage mode
- **Search** — **[MiniSearch](https://lucaong.github.io/minisearch/)** · **Downloads** — JSZip (EPUB) + PDFKit (PDF)
- **Tests** — **[Vitest](https://vitest.dev)** + Testing Library (jsdom)
- **Hosting** — a Node service on **[Railway](https://railway.app)**, served from `/`

## Quick start

> Requires **Node 22+** (`.nvmrc` pins 22).

```bash
git clone https://github.com/markwuenschel-dev/dominion-realm.git
cd dominion-realm
npm install
cp .env.example .env   # optional locally; needed for the /keystatic admin
npm run dev            # → http://localhost:3000
```

The public site runs without any environment variables. The Keystatic admin and
the optional integrations (analytics, newsletter, buy button) light up once the
matching variables are set — see [Environment variables](#environment-variables).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server at `http://localhost:3000` |
| `npm run build` | Production build (`next build`) |
| `npm run start` | Serve the production build (reads `$PORT`) |
| `npm run check` | Type-check + content-schema validation (`tsc --noEmit`) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint (`next lint`) |
| `npm run format` / `format:check` | Write / verify Prettier formatting |

`predev` and `prebuild` automatically copy content media into `public/` and
generate the EPUB/PDF reading-sample downloads.

## Project structure

```text
src/
  app/                     App Router routes
    page.tsx               home
    codex/                 world codex (index, [collection]/[id], shared layout)
    read/                  reading sample (index, [id])
    journal/               author journal (index, [id])
    map/  relationships/   interactive map + constellation
    eyes/  interface/      the Eyes interactive + character sheet
    keystatic/  api/keystatic/   the CMS admin + its OAuth route handler
    rss.xml/               feed (force-static)
  components/              UI: chrome, cards, search, reveal gate/toggle, MDX body
  content/                 the canon — Markdown/MDX (codex, journal, reading)
  lib/                     content loader (Zod), reveal model, search, downloads, site config
  styles/                  design tokens + per-surface CSS
scripts/                   prebuild media copy + EPUB/PDF generation
docs/                      ADRs, PRD, and the author's content guide
```

## Authoring content

Most of the site is Markdown under `src/content/`. Add a file, write the
frontmatter and body, commit — the filename becomes the URL slug, and the Zod
loader rejects a malformed entry at build time.

| Collection | Folder | URL |
| --- | --- | --- |
| Codex — characters / concepts / factions / places | `src/content/<collection>/` | `/codex/<collection>/<slug>` |
| Author Journal | `src/content/journal/` | `/journal/<slug>` |
| Reading Sample | `src/content/reading/` | `/read/<slug>` |

Prefer a UI? Open **`/keystatic`** to edit in the browser; every save is a commit
or branch on this repository.

📖 **Full author's guide:** [`docs/CONTENT.md`](docs/CONTENT.md) — frontmatter
fields, the reveal-tier model, the `draft` flag, worked examples, and the
publish flow.

### The reveal model

Every codex and journal entry declares a minimum **reveal tier**. Readers pick
their level with the global toggle; content at or below that level is shown, and
anything above stays sealed — and is never sent to the browser or the search
index.

| Tier | For |
| --- | --- |
| `teaser` | Anyone — marketing-safe, the default |
| `reader` | Currently reading the book |
| `deep` | Finished Book One |
| `beyond` | Series-level, forward-looking |

See [ADR-0004](docs/adr/0004-reveal-tier-model.md) for the rationale.

## Environment variables

Copy `.env.example` to `.env` for local use and set the same values in the
Railway dashboard for production. Nothing here is required to run the public
site.

| Variable | Required for | Notes |
| --- | --- | --- |
| `KEYSTATIC_GITHUB_CLIENT_ID` | `/keystatic` admin | From the Keystatic GitHub App (ADR-0009) |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | `/keystatic` admin | From the same GitHub App |
| `KEYSTATIC_SECRET` | `/keystatic` admin | Any random 32+ char string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical/OG tags, RSS | e.g. `https://dominionrealm.com` |
| `NEXT_PUBLIC_GA4_ID` | Analytics | Google Analytics 4 measurement ID |
| `NEXT_PUBLIC_KIT_FORM_ID` | Newsletter | Kit (ConvertKit) form ID |
| `NEXT_PUBLIC_BUY_URL` | Buy button | Real product/checkout URL; unset → "Coming soon" newsletter fallback |
| `NEXT_PUBLIC_BUY_LABEL` | Buy button | Optional button text |

## Deployment

Hosted as a Node service on **Railway**. Railpack auto-detects the Next.js build;
`railway.json` pins `npm run start` as the start command. Pushing to `main`
deploys automatically.

1. **New Project → Deploy from GitHub repo → `dominion-realm`**.
2. Add the environment variables above under the service's **Variables** tab.
3. Set `NEXT_PUBLIC_SITE_URL` to the Railway domain (correct canonical/OG/RSS URLs).
4. Point the Keystatic GitHub App's OAuth **callback URL** at
   `https://<railway-domain>/api/keystatic/github/oauth/callback`.

See [ADR-0010](docs/adr/0010-migrate-astro-to-nextjs.md) for the architecture and
the migration from the original Astro stack.

## Testing & CI

```bash
npm run check   # types + content schema
npm test        # Vitest (lib + component coverage)
npm run build   # the real content-schema gate
```

Every pull request runs the **CI** workflow — `format:check → tsc → next build →
vitest` — plus an advisory accessibility audit. Branch protection should require
the build job before merge.

## Documentation

- [`docs/CONTENT.md`](docs/CONTENT.md) — the author's content guide
- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- [`docs/prd/`](docs/prd/) — product requirements

## License

© 2026 Mark Wuenschel. Released under
[Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International](LICENSE.md)
(CC BY-NC-ND 4.0). The story, characters, world, and text of _The Dominion Realm_
are all rights reserved.
