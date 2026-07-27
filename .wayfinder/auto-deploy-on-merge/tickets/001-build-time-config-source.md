---
id: 1
title: "Where does the production build get its build-time configuration?"
type: design
state: open
claimed_by: ""
decision_owner: ""
blocked_by: [2]
created: 2026-07-27
closed: null
---

## Question

Next.js inlines `NEXT_PUBLIC_*` at build time. The production image's build stage
receives **no environment at all** — so what is the mechanism by which the triggered
pipeline supplies build-time configuration, and which store is authoritative?

## Context

Verified on the box 2026-07-27:

- `Dockerfile.dominion-realm:11-22` — the `build` stage runs `pnpm build` with no
  `ARG`/`ENV` for any `NEXT_PUBLIC_*` value.
- `docker-compose.yml:91-99` — the `dominion-realm` service declares `env_file:
  ./env/dominion-realm.env` and no `build.args`. `env_file` applies to the **runtime**
  container, never the build stage.
- The on-box env file defines only four names: `NEXT_PUBLIC_SANITY_DATASET`,
  `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN`,
  `SANITY_REVALIDATE_SECRET`. No site URL, no GA4 id, no Kit form id, no Keystatic vars.
- Observable consequence in the live HTML: `og:image` resolves to
  `https://thedominionrealm.com/og-default.png` — the `src/lib/site.ts:24-26` fallback
  firing because `NEXT_PUBLIC_SITE_URL` is unset — while the site actually serves from
  `dominionrealm.44-198-76-44.nip.io`. No `googletagmanager.com` reference appears
  anywhere in the document.
- The repo-side store has drifted too: CI reads `vars.NEXT_PUBLIC_GA4_ID` /
  `NEXT_PUBLIC_KIT_FORM_ID` / `NEXT_PUBLIC_SITE_URL`, but the configured repo Variables
  are named `PUBLIC_GA4_ID` and `PUBLIC_KIT_FORM_ID`, and no site-URL variable exists.

Blocked by [Where does the image build](002-build-location.md): if the build moves to
CI the config comes from the Actions environment; if it stays on the box it comes from
compose `build.args` or an env file read at build time. The mechanism is not
separable from the location.

Note: repairing today's broken analytics and social URLs is **delivery work**, not this
map's decision. This ticket decides the mechanism the pipeline uses; the repair is
routed separately.
