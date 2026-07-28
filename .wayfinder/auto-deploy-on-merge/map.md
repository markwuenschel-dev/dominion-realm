---
kind: wayfinder-map
state: open
driver: "markwuenschel-dev"
created: 2026-07-27
successor: null
---

## Destination

Produce a resolved decision path for moving production deploys of The Dominion Realm
from a local operator script to an **explicitly-triggered** CI pipeline — the trust
boundary CI crosses to reach the shared EC2 box, where the build runs, what must be
verified before and after a deploy, and how a bad deploy is detected and reversed —
sufficient for an implementer to build it without further architectural decisions.

> Amended 2026-07-27 during charting, before any ticket existed. The original draft
> read "automating production deploys … **on merge to `main`**". The driver ruled that
> no commit auto-deploys and that deploys are triggered explicitly, which killed the
> trigger clause while leaving every other condition intact. Amended in place rather
> than via a successor map only because the map held zero tickets and zero decisions;
> a redraw after any ticket closes requires a successor map.

## Notes

**Domain.** One Next.js app (`output: 'standalone'`, `next.config.mjs:37`) running as one
Docker Compose service among several on a shared Ubuntu EC2 box behind Caddy
(ADR-0012). Deploys today are a human running `scripts/deploy.ps1`, which SSHes in,
hard-syncs a deploy-only clone, and runs `docker compose up -d --build dominion-realm`.

**Governing records.** ADR-0012 (hosting; names auto-deploy as an open Follow-up at
`:69-70`, not a rejected option), ADR-0011 (media revalidates without a deploy),
ADR-0014 (default CI stays network-free).

**Standing preferences for this effort.**
- Claims carry their evidence: `file:line` or command output, or they are marked
  `[assumed]`. Scout claims are `[inferred]` until the parent re-checks them.
- Decisions get a visual before prose.
- The box is **shared with other production services**. Blast radius beyond this app
  is a first-class concern in every transport decision, not a footnote.

**Load-bearing facts established during charting** (all verified this session):
- No branch protection on `main` (`gh api …/branches/main/protection` → 404).
- Zero Actions secrets, zero self-hosted runners, OIDC unconfigured and unused.
- No Dockerfile, compose file, or `deploy.sh` exists in this repo — the compose stack
  lives in `/opt/stack/infra`, a separate repo currently push-blocked (403).
- `scripts/deploy.ps1` never consults CI status before deploying whatever is on
  `origin/main`.
- Keystatic in GitHub mode commits **directly to `main`**, no PR
  (`keystatic.config.ts:93-106`).

## Decisions so far

<!-- one line per closed ticket; never restate the decision here -->

- [002 — Does the image build on the box or in CI?](tickets/002-build-location.md) — closed 2026-07-27 → D-04, D-07, D-09
- [003 — What must be true about a commit before the pipeline will deploy it?](tickets/003-what-must-be-green.md) — closed 2026-07-27 → D-05
- [006 — What should a triggered deploy do when the box is powered off?](tickets/006-deploy-to-a-stopped-box.md) — closed 2026-07-27 → D-06, D-10

## Not yet specified

_Cleared 2026-07-27 by the authorized read-only box inspection: the shared box's
tenants, the production Dockerfile, and the compose topology are now known and have
graduated into tickets 001–006. What remains dim:_

- **Whether a Keystatic-authored commit is distinguishable from a human one** at the
  GitHub API level. Lower stakes than at charting time: the driver ruled no commit
  auto-deploys, so this only matters if a future rule change reintroduces a
  commit-driven trigger. Separately `[inferred, unverified]` — the on-box env file
  carries no `NEXT_PUBLIC_KEYSTATIC_GITHUB`, and `keystatic.config.ts:93-106` gates
  GitHub mode on that flag, so production `/keystatic` is likely in **local** mode and
  cannot commit at all. The rendered shell is client-side and did not confirm it.
- **Interaction with the domain cutover.** Production serves from a `nip.io` hostname
  while the code's fallback and the docs both name `thedominionrealm.com`. The health
  target belongs to ticket 004; whether the cutover itself joins this map is still an
  open scope question, deliberately unasked while the frontier is this wide.
- **Disk headroom as a deploy constraint.** The root volume is at 74% (7.3 G free) with
  BuildKit cache mounts that grow per build. Whether that bounds on-box build
  frequency is visible but not yet sharp — it needs a measurement across a few builds,
  not a decision today.

## Out of scope

- **The media path.** Sanity Studio edits go live via the revalidation webhook with no
  commit and no deploy (ADR-0011 `:6-8, :65-67`) — automating deploys does not touch it.
- **Backup and restore automation.** ADR-0013's export job is a separate scheduled
  Action against S3; it neither triggers nor is triggered by an app deploy.
- **Enforcing gates at GitHub.** Branch protection and required status checks on `main`
  are a separate effort — driver ruling, 2026-07-27. The pipeline's *own* pre-deploy
  check survives as ticket 003.
- **Provisioning a new deploy identity on the box.** A deploy-scoped user, a separate
  key, or an SSM/OIDC path are ruled out — automation reuses the existing
  `shared-box.pem` access model (driver ruling, 2026-07-27). Containment of that
  credential remains in scope as ticket 005.
- **Repairing today's broken build-time configuration.** Production currently ships with
  no analytics and social URLs pointing at an unregistered domain, because the Docker
  build stage receives no environment. That repair is delivery work; this map only
  decides the mechanism the pipeline will use (ticket 001).
- **Implementing the deploy.** This map resolves decisions only; delivery is selected
  elsewhere.
