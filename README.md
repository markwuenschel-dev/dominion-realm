# The Dominion Realm — Showcase Site

Public showcase for *The Dominion Realm* (Realmwalkers · Book One). Astro static site,
ported from the original single-file design with the visual identity preserved exactly:
deep blue-black palette, bone text, gold accent, the spectral gradient, film grain,
ambient glow, scroll reveals, scrollspy, and the lighting power-rail.

Deploys to **GitHub Pages** and **Netlify** from the same repo with no config to toggle —
the build environment picks the right base path automatically.

## Run locally (PowerShell 7+)

```powershell
# from the unzipped folder
npm install
npm run dev          # http://localhost:4321
```

```powershell
npm run build        # outputs to .\dist
npm run preview      # serve the production build locally
```

Requires Node 18+ (you have 22). `.nvmrc` pins 22.

## Push to GitHub (repo already exists)

```powershell
git init
git add .
git commit -m "Showcase site: Astro port"
git branch -M main
git remote add origin https://github.com/markwuenschel-dev/dominion-realm.git
git push -u origin main
```

If the remote already has commits: `git pull --rebase origin main` first, then push.

## Deploy — GitHub Pages

1. Push to `main` (above). The workflow in `.github/workflows/deploy.yml` runs automatically.
2. One-time: repo **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
3. Live at **https://markwuenschel-dev.github.io/dominion-realm/**

The build runs inside GitHub Actions, where `GITHUB_ACTIONS=true`, so `astro.config.mjs`
serves under the `/dominion-realm` base path automatically.

## Deploy — Netlify

1. Netlify → **Add new site → Import an existing project → GitHub → `dominion-realm`**.
2. Build command and publish dir come from `netlify.toml` (`npm run build` → `dist`). Nothing to type.
3. Netlify builds at the **root** base path (no `GITHUB_ACTIONS` var), so links resolve correctly there too.
4. After you get your Netlify URL, set it as `site` in `astro.config.mjs` (the Netlify branch of the ternary) so canonical/OG tags are right.

## Where to edit content

Content lives in two places. **Most of it is Markdown.**

**1. Content Collections** (the World Codex, the Journal, the Reading Sample) — folders of
Markdown files under `src/content/`. Add a file, write the frontmatter + body, commit. The
filename becomes the URL slug.

| Collection | Folder | URL |
|---|---|---|
| Codex — characters / concepts / factions / places | `src/content/<collection>/` | `/codex/<collection>/<slug>` |
| Author Journal (Field Notes + From the Desk) | `src/content/journal/` | `/journal/<slug>` |
| Reading Sample (Prologue + Chapter One) | `src/content/reading/` | `/read/<slug>` |

**2. The hand-coded homepage** (`src/pages/index.astro`) and Eyes page (`src/pages/eyes.astro`) —
edit the markup directly (search for the marker text):

| To change… | Search for |
|---|---|
| Logline / hero | `hero-logline` |
| Buy links (Amazon, B&N) | `Buy on Amazon` |
| Homepage characters (Soren, Serra, Seb) | `char-name` |
| The World pitch (Eriadne, the two endings) | `world-name` |
| The six Eyes stages | `stage-name` |
| Author name / socials | `[ Author Name ]` |

Design tokens (palette, fonts, the spectral gradient) are in **`src/styles/tokens.css`**.
The favicon is `public/favicon.svg`.

📖 **Full author's guide: [`docs/CONTENT.md`](docs/CONTENT.md)** — frontmatter fields, the
reveal-tier model, the `draft` flag, worked examples, the publish flow, and the Keystatic CMS.

## Structure

```
src/
  content/               the Markdown content collections (codex, journal, reading)
  content.config.ts      the schema for every collection — validated at build time
  lib/reveal.ts          the four-tier reveal vocabulary (single source of truth)
  layouts/Base.astro     <head>, fonts, meta, the <body> shell
  pages/index.astro      hand-coded homepage (all hero/pitch markup + site JS)
  pages/eyes.astro       the Eyes of Meszkhal interactive
  styles/tokens.css      design tokens (palette, fonts, gradient) — single source of truth
  styles/global.css      the homepage + shared stylesheet
public/
  favicon.svg            spectral-iris mark
  .nojekyll              lets GitHub Pages serve the _astro/ asset folder
.github/workflows/deploy.yml   GitHub Pages CI
netlify.toml                   Netlify build config
astro.config.mjs               site + auto base-path
docs/                          PRD, ADRs, and the author's content guide (CONTENT.md)
```

## Optional later

- **Offline fonts:** swap the Google Fonts `<link>` in `Base.astro` for `@fontsource` packages
  (`@fontsource/cormorant-garamond`, `@fontsource/spectral`, `@fontsource/space-mono`) to drop the external request.
- **Email signup:** already wired to Kit (ADR-0005) — set `PUBLIC_KIT_FORM_ID` to point it at your form; without it the form falls back to a friendly local confirmation.
