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

Everything lives in **`src/pages/index.astro`** (search for the marker text):

| To change… | Search for |
|---|---|
| Logline / hero | `hero-logline` |
| Buy links (Amazon, B&N) | `Buy on Amazon` |
| Characters (Soren, Serra, Seb) | `char-name` |
| The World (Eriadne, Xyloryn, Zalgorans) | `world-name` |
| The six Eyes stages | `stage-name` |
| Author name / socials | `[ Author Name ]` |

Design tokens (palette, fonts, the spectral gradient) are the `:root` block at the top of
**`src/styles/global.css`**. The favicon is `public/favicon.svg`.

## Structure

```
src/
  layouts/Base.astro     <head>, fonts, meta, the <body> shell
  pages/index.astro      all page content + the site JS (verbatim, is:inline)
  styles/global.css      the full original stylesheet, unchanged
public/
  favicon.svg            spectral-iris mark
  .nojekyll              lets GitHub Pages serve the _astro/ asset folder
.github/workflows/deploy.yml   GitHub Pages CI
netlify.toml                   Netlify build config
astro.config.mjs               site + auto base-path
```

## Optional later

- **Offline fonts:** swap the Google Fonts `<link>` in `Base.astro` for `@fontsource` packages
  (`@fontsource/cormorant-garamond`, `@fontsource/spectral`, `@fontsource/space-mono`) to drop the external request.
- **Componentize** the character and stage blocks into `src/components/` once you start adding more — the markup is plain Astro, so each repeating block lifts out cleanly.
- **Real signup:** the form is a mock (`signupForm` handler in `index.astro`). Point it at a Netlify Form, Buttondown, or your own endpoint when ready.
