# Host on AWS EC2 (Docker container behind Caddy)

The site moves off **Railway** to **AWS EC2**: the Next.js app runs as a **Docker
container**, fronted by a **[Caddy](https://caddyserver.com)** reverse proxy that
terminates TLS (automatic Let's Encrypt) and routes each app to the root of its own
hostname. This supersedes the **hosting** decision in
[ADR-0010](0010-migrate-astro-to-nextjs.md); the framework (Next.js App Router),
the served-from-`/` posture, the content/search/CMS model, and the Sanity media
layer ([ADR-0011](0011-media-layer-sanity.md)) are all unchanged. Only the platform
running the Node server, and the way code reaches production, change.

Status: accepted (2026-07-09).

## Context

Railway is retired. We want the whole stack — compute, networking, budget, and a
single kill switch — in one **AWS** account we control, alongside other small apps.
The trade is explicit: EC2 is raw IaaS, so we take on the ops (process supervision,
reverse proxy, TLS, env management, deploys) that Railway did for us.

## Decision

- **Compute.** A single EC2 instance (Ubuntu) with a stable **Elastic IP**. Multiple
  small apps share the box via a Docker Compose stack (the site is one service among
  several, plus Postgres).
- **Container.** The app ships as a Docker image that runs `next build` then
  `next start` (reads `$PORT`, binds internally). No static export — it stays a Node
  server, exactly as under Railway.
- **Reverse proxy.** One **Caddy** container owns `:80`/`:443`, terminates TLS with
  auto-provisioned Let's Encrypt certs, and reverse-proxies each app. **Each app is
  served at the root of its own hostname** — *not* under a path prefix. This is
  load-bearing: the app pins itself to `/` (root-absolute `/_next/*` and `/api/*`),
  so serving it under a subpath (e.g. `/dominion/*`) breaks every asset and API URL.
- **Domains.** Target public name is **`thedominionrealm.com`** (Route 53 registration
  is pending). Until it resolves, the site is served at a **nip.io** wildcard-DNS
  hostname against the Elastic IP (real Let's Encrypt cert). Swapping to the real
  domain is a DNS A-record + a Caddy hostname change — no code change, because the
  public origin is env-driven (`NEXT_PUBLIC_SITE_URL`, see `src/lib/site.ts`).
- **Environment.** Per-service `.env` files on the host (e.g.
  `env/dominion-realm.env`), **not** a hosting dashboard. This is where the Keystatic
  GitHub-App secrets, `SANITY_REVALIDATE_SECRET`, and `NEXT_PUBLIC_SITE_URL` live.
- **Deploy.** A **manual container rebuild** on the host:
  `docker compose build dominion-realm && docker compose up -d dominion-realm`.
  Pushing to `main` does **not** auto-deploy.

## Consequences

- **We own the whole stack.** One AWS account, one bill, one kill switch — the goal
  of leaving Railway.
- **No auto-deploy (regression from Railway).** Content edited via Keystatic commits
  to `main` but does **not** go live until someone rebuilds the container. The docs
  (README, `docs/CONTENT.md`) now say this plainly. A small CI/CD auto-deploy (e.g. a
  GitHub Action that SSHes in and rebuilds on push to `main`) is the obvious
  follow-up to close the gap. **Media edits are unaffected** — Sanity Studio changes
  still go live in seconds via the revalidate webhook (ADR-0011), independent of code
  deploys.
- **More ops surface.** TLS renewal (handled by Caddy), process restarts, and env
  management are now ours. Caddy makes TLS and routing low-touch.
- **`NEXT_PUBLIC_*` are present-but-empty in the build env.** Bare `KEY=` lines are
  empty strings, not unset, so `??` fallbacks don't fire. Env-driven defaults must
  use `?.trim() || default` (see `src/lib/site.ts`); an empty `NEXT_PUBLIC_SITE_URL`
  once crashed the build via `new URL('')`.
- **`railway.json` is removed** and Railway references across the README, `.env.example`,
  CI comments, and living docs are updated; ADR-0010/0011 keep their Railway wording as
  historical record under a superseding banner.

## Follow-ups

- Complete `thedominionrealm.com` registration and cut over DNS + Caddy + `NEXT_PUBLIC_SITE_URL`.
- Add a CI/CD path so a push to `main` deploys (restores the Railway-era convenience).
