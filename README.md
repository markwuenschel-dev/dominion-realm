# The Dominion Realm — Showcase Site

Public showcase for *The Dominion Realm* (Realmwalkers · Book One). **Next.js (App
Router) + React**, served as a Node process on **Railway** (see
[ADR-0010](docs/adr/0010-migrate-astro-to-nextjs.md)). Ported from the original
single-file design with the visual identity preserved exactly: deep blue-black
palette, bone text, gold accent, the spectral gradient, film grain, ambient glow,
scroll reveals, scrollspy, and the lighting power-rail.

The site is served from the root path (`/`) — there is no GitHub Pages subpath or
dual-host base-path toggle anymore.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build (.next/)
npm run start        # serve the production build (reads $PORT, defaults to 3000)
npm run check        # tsc --noEmit (types + content-schema sanity)
npm run format       # prettier --write .
```

Requires Node 22+ (`.nvmrc` pins 22; `package.json` engines pin `>=22`).

Environment variables: copy `.env.example` to `.env` and fill in the Keystatic
GitHub-App credentials (for `/keystatic` cloud editing) and the optional public
IDs (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_KIT_FORM_ID`).

## Deploy — Railway

1. Railway → **New Project → Deploy from GitHub repo → `dominion-realm`**.
2. Railpack auto-detects the Next.js build from `package.json`; `railway.json`
   pins `npm run start` (→ `next start`) as the start command.
3. Set the env vars from `.env.example` in the service's **Variables** tab.
4. Railway deploys automatically on push to `main`. Set `NEXT_PUBLIC_SITE_URL`
   to the Railway domain so canonical/OG tags and the RSS feed are correct.
5. Point the Keystatic GitHub App's OAuth **callback URL** at the Railway host:
   `https://<railway-domain>/api/keystatic/github/oauth/callback`.

CI (`.github/workflows/ci.yml`) gates every PR with `format:check` → `npm run check`
→ `next build`, plus an advisory a11y audit. Deployment is Railway's job, not CI's.

## Where to edit content

Content lives in two places. **Most of it is Markdown.**

**1. Content collections** (the World Codex, the Journal, the Reading Sample) —
folders of Markdown files under `src/content/`. Add a file, write the frontmatter +
body, commit. The filename becomes the URL slug. The schema is validated at build
time by the Zod loader in `src/lib/content.ts`.

| Collection | Folder | URL |
|---|---|---|
| Codex — characters / concepts / factions / places | `src/content/<collection>/` | `/codex/<collection>/<slug>` |
| Author Journal (Field Notes + From the Desk) | `src/content/journal/` | `/journal/<slug>` |
| Reading Sample (Prologue + Chapter One) | `src/content/reading/` | `/read/<slug>` |

Or edit in the browser via **Keystatic** at `/keystatic` (commits straight to the
repo — ADR-0009).

**2. The hand-coded homepage** (`src/app/page.tsx` + `src/components/HomeClient.tsx`)
and the Eyes page (`src/app/eyes/page.tsx`) — edit the markup directly (search for
the marker text):

| To change… | Search for |
|---|---|
| Logline / hero | `hero-logline` |
| Hero call-to-action buttons | `buy-row` |
| Homepage characters (Marcus, Serra, Seb) | `char-name` |
| The World pitch (Eriadne, the two endings) | `world-name` |
| The six Eyes stages | `stage-name` |
| Author name / socials | `[ Author Name ]` (in `src/lib/site.ts`) |

Design tokens (palette, fonts, the spectral gradient) are in **`src/styles/tokens.css`**.
The favicon is `public/favicon.svg`.

📖 **Full author's guide: [`docs/CONTENT.md`](docs/CONTENT.md)** — frontmatter fields, the
reveal-tier model, the `draft` flag, worked examples, the publish flow, and the Keystatic CMS.

## Structure

```
src/
  app/                   App Router routes (pages + /api/keystatic, rss.xml)
  components/            React components (HomeClient, reveal gate, search, …)
  content/               the Markdown content collections (codex, journal, reading)
  lib/content.ts         the Zod schema + loader for every collection (build-time validation)
  lib/reveal.ts          the four-tier reveal vocabulary (single source of truth)
  lib/site.ts            site chrome data (nav, socials, axioms, timeline)
  styles/tokens.css      design tokens (palette, fonts, gradient) — single source of truth
  styles/global.css      the homepage + shared stylesheet
public/
  favicon.svg            spectral-iris mark
  content-media/         art copied from src/content at prebuild (gitignored)
keystatic.config.ts      Keystatic CMS schema (mirrors the content loader)
next.config.mjs          Next.js + MDX config
railway.json             Railway deploy config (start command, restart policy)
.github/workflows/ci.yml PR validation gate
docs/                    PRD, ADRs, and the author's content guide (CONTENT.md)
```

## Optional later

- **Email signup:** already wired to Kit (ADR-0005) — set `NEXT_PUBLIC_KIT_FORM_ID`
  to point it at your form; without it the form falls back to a friendly local confirmation.
- **Analytics:** set `NEXT_PUBLIC_GA4_ID` to enable Google Analytics 4.
