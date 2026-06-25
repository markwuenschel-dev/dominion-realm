# Migrate from Astro to Next.js + React, hosted on Railway

The site moves off **Astro** (static, dual-hosted on GitHub Pages + Netlify) to **Next.js (App Router) + React**, served as a **Node process on Railway**. This supersedes the stack decision in [ADR-0008](0008-stack-astro-typescript-vanilla-islands.md) and the hosting/static posture in [ADR-0001](0001-static-site-third-party-services.md) and [ADR-0009](0009-cms-keystatic.md). The product, the four-tier reveal model ([ADR-0004](0004-reveal-tier-model.md)), the content model ([ADR-0002](0002-content-collections.md)), and the visual identity ([ADR-0007](0007-evolve-not-reinvent-identity.md)) are unchanged — only the framework, host, and a few build-time mechanisms change.

Status: accepted.

## What changes

- **Framework.** Astro components/pages → Next.js App Router pages and React Server/Client Components. Astro islands (the reveal toggle, the Eyes interactive, the Interface sheet, the homepage scroll behaviour) become React client components.
- **Host.** GitHub Pages + Netlify → a single **Railway** Node service (`next build` then `next start`, Nixpacks auto-detected). The project **base path is removed** — the site is served from `/`, so all the `BASE_URL`-prefixed link plumbing is gone.
- **Content.** Astro Content Collections → a small typed loader (`src/lib/content.ts`) built on `fast-glob` + `gray-matter` + **Zod** that mirrors the old `content.config.ts` schemas. Bodies render through MDX (`@next/mdx` for page-level, `next-mdx-remote` for loader-driven entry bodies). **The build gate is preserved**: the Zod loader throws on malformed frontmatter (bad `reveal` tier, missing field), so `next build` fails rather than shipping a broken entry — exactly as Astro's schema validation did.
- **Search.** Pagefind (which indexed static HTML we no longer emit) → a **build-time MiniSearch** corpus (`src/lib/search.ts` + `SearchBox`). The spoiler guarantee is preserved: above-teaser bodies are **excluded** from the index (only title + summary index for gated entries), the same protection Pagefind got from `data-pagefind-ignore`.
- **Images.** Astro's `image()` pipeline → frontmatter image paths are copied to `public/content-media/<collection>/` at prebuild (`scripts/copy-content-media.mjs`) and referenced as URLs; in-page art uses `next/image` with static imports.
- **Fonts.** Astro Font API → `next/font/google`, exposing the same `--font-display|body|mono` variables `tokens.css` already resolves.
- **Analytics / email.** GA4 and the Kit form move from `PUBLIC_*` to `NEXT_PUBLIC_*` env vars.
- **CMS.** Keystatic moves from `@keystatic/astro` to `@keystatic/next`. Because Railway runs a real Node server, the admin and its `/api/keystatic/*` OAuth routes work on the **main deploy** — the Netlify-only split in [ADR-0009](0009-cms-keystatic.md) is no longer needed. `keystatic.config.ts` is unchanged (it uses framework-agnostic `@keystatic/core`).
- **CI/CD.** `deploy.yml` (Pages + Netlify) and `netlify.toml` are removed; Railway deploys on push to `main`. `ci.yml` keeps the `verify` gate (`format:check` → `tsc --noEmit` → `next build`) and the advisory a11y job (now auditing `next start` on `:3000`); the base-path link guard is dropped.

## Why

Railway gives a single Node deploy that runs the CMS, dynamic routes, and on-demand revalidation if we ever want them — collapsing the awkward two-target Astro split (static Pages + SSR-only-for-Keystatic Netlify) into one environment, and removing the base-path friction that came from GitHub Pages' subpath.

## Consequences

- **Railway env vars** must be set on the service (see below). The three `KEYSTATIC_*` values are **secrets**.
- The Astro `.astro` pages/layouts/components and `astro.config.mjs` are deleted at cutover; `keystatic.config.ts` must still be kept in lockstep with `src/lib/content.ts` (add a field to one → add it to the other, or new entries won't round-trip).
- Sealed (above-teaser) content still travels in the RSC payload — the same honest limit as the Astro `<template>` approach: this guards against accidental spoilers, not a determined view-source.

## Railway environment

| Variable | Secret? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_KIT_FORM_ID` | no | Kit (ConvertKit) email signup form id |
| `NEXT_PUBLIC_GA4_ID` | no | GA4 measurement id (analytics off when unset) |
| `NEXT_PUBLIC_SITE_URL` | no | Absolute origin for RSS/OG links (e.g. `https://dominionrealm.com`) |
| `KEYSTATIC_GITHUB_CLIENT_ID` | **yes** | Keystatic GitHub App client id |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | **yes** | Keystatic GitHub App client secret |
| `KEYSTATIC_SECRET` | **yes** | Keystatic session signing secret |

The Keystatic GitHub App's OAuth **callback URL** must point at the Railway host: `https://<railway-domain>/api/keystatic/github/oauth/callback` (the setup checklist in [ADR-0009](0009-cms-keystatic.md) still applies, only the host changes from Netlify to Railway).
