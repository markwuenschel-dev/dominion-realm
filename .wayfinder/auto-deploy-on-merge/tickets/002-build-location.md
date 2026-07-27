---
id: 2
title: "Does the image build on the box or in CI?"
type: design
state: closed
claimed_by: "mark-cc-0727a"
decision_owner: "markwuenschel-dev"
blocked_by: []
created: 2026-07-27
closed: 2026-07-27
---

## Resolution

**In CI, on a native ARM runner, shipped through GHCR.** Option B. Recorded as
[D-04](../design/decisions.md); sizing and topology consequences as D-07; the GHCR
visibility condition as D-09.

The owner's stated pain was *"production should not be compiling"* — the instance had
already been downsized to `t4g.small` for cost, and the build is the one workload that
does not fit the resulting envelope.

Answering this ticket's own counterweight: **the type-check gate is not lost.**
`next.config.mjs:47-53` sets no `typescript.ignoreBuildErrors`, so `next build`
type-checks by default. Under Option B that build runs in CI, so a type error fails the
workflow and **no image is produced** — the gate fires before production is touched
rather than during a deploy. Nothing needs to replace it.

Costing settled against official docs: `dominion-realm` is a **public** repo and
`ubuntu-24.04-arm` is a **standard** runner, so build minutes are free and unlimited. The
box-side `docker pull` is free **iff** the package's own visibility is set to Public — it
does **not** inherit that from the public repo, and a private 553 MB package would bust
the Free plan's 500 MB allowance immediately (D-09).

Carried into delivery, from this ticket's context: the BuildKit cache mounts at
`Dockerfile.dominion-realm:16-17,:21-22` are forfeited by the move and must be replaced
with a CI-side cache, or every build is cold.

## Question

Does the production image continue to build **on the shared EC2 box**, or is it built
in CI and shipped to the box as an artifact?

## Context

This is the keystone decision: it blocks the config mechanism, the reversal path, and
the credential shape.

Verified on the box 2026-07-27:

- Host: `aarch64`, **2 cores, 1.8 GiB RAM**, 4 GiB swapfile, root disk 74% used
  (7.3 G free).
- The box is genuinely multi-tenant. Six containers run under one compose project:
  `dominion-realm`, `realmwalkers`, `perf-lab-api`, `leave-sprint`, `caddy`, and a
  `pgvector/pgvector:pg16` Postgres. With all six up, **623 MiB was available**.
- `Dockerfile.dominion-realm:11-22` runs `pnpm install` **and** `pnpm build` inside the
  build stage — i.e. a full Next.js compile on that 1.8 GiB host, alongside four live
  services.
- The Dockerfile leans on BuildKit cache mounts for the pnpm store and Next's compile
  cache (`:16-17`, `:21-22`). Those caches live on the box; moving the build to CI
  forfeits them unless CI reproduces the caching.
- `docker-compose.yml:12-13` — only Caddy publishes ports; every app is reachable only
  on internal Docker networks.
- Architecture matters: the host is ARM64. A CI-built image must either run on ARM
  runners or cross-build, which changes cost and build time.

Counterweight from the repo side: `next.config.mjs:41-46` keeps type-checking inside
the build **deliberately**, on the stated grounds that "the Docker build on the box is
the last gate before a deploy." Moving the build removes a gate that comment relies on
— so this decision must say what replaces it.
