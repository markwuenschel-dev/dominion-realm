# Design — triggered deploy pipeline

`implementation_authorized: false`. Status: **interview in progress**, Round 1 partially
answered — **Option B selected** (D-04), sizing and topology settled (D-07). U-02…U-05
still open.

## Problem

Deploying requires the operator to be at a specific Windows machine running
`scripts/deploy.ps1`. The deploy is otherwise sound: it syncs a deploy-only clone,
rebuilds one compose service, tails logs, and probes the public URL. The question is
what to relocate and what to leave alone.

## Constraints established by evidence

| Constraint | Evidence | Confidence |
|---|---|---|
| Host is ARM64, **2 vCPU, 1.8 GiB RAM**, 4 GiB swap | `aws ec2 describe-instances` → `t4g.small`; `free -h` | verified |
| Host runs **four production apps + Caddy + Postgres**; ~184 MiB free at idle | `docker ps`, `free -h` | verified |
| Root disk **74% full (7.3 G free)**; Docker build cache alone is **10.34 GB** | `df -h`, `docker system df -v` | verified |
| The box exists to escape metered billing after a **$138 surprise bill (~$135 egress)** | `/opt/stack/infra/README.md` | verified |
| Building on the box is a **recorded decision**, not an accident — "no image registry" | `/opt/stack/infra/PROVISION.md` §8 | verified |
| The Dockerfile and compose file live in the **infra repo**, whose remote embeds a plaintext PAT and is push-blocked | `/opt/stack/infra/.git/config`, prior 403 | verified |
| The on-box Docker build is currently the last type-check gate before production | `next.config.mjs:41-46` | verified |
| Build stage receives **no environment**; `NEXT_PUBLIC_*` are absent from the production bundle | `Dockerfile.dominion-realm:11-22`, `docker-compose.yml:96`, live HTML | verified |

## Options

### Option A — Relocate the trigger only

CI job connects to the box and runs the sequence `deploy.ps1` runs today. The build
still happens on the box.

- **Build location:** unchanged (on box).
- **Cost:** effectively zero — the job is mostly idle waiting on SSH.
- **New surface:** the SSH key as an Actions secret; possibly inbound SSH from
  GitHub-hosted runner IP ranges, which are broad and change.
- **Solves:** operator no longer tied to one machine; every deploy gets a run log.
- **Does not solve:** build contention on a 1.8 GiB box shared with four live
  services; build-cache disk growth.
- **Rollback:** unchanged — redeploy a prior ref, which rebuilds.
- **Infra-repo changes required:** none.

### Option B — Build in CI on a native ARM runner, ship through GHCR — **SELECTED (D-04)**

`ubuntu-24.04-arm` builds the image, pushes to GHCR; the box pulls and restarts.

- **Build location:** CI. The box does no compiling.
- **Cost: $0 for the build.** `dominion-realm` is a **public** repo, and
  `ubuntu-24.04-arm` is a **standard** runner, not a larger runner — "Use of the
  standard GitHub-hosted runners is free and unlimited on public repositories"
  ([GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)).
  The $0.005/min ARM rate ([runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing))
  and the Free plan's 2,000 included minutes apply only to **private** repos, so neither
  binds here. GHCR storage and transfer remain open — see the risk below.
- **New surface:** `packages: write`, registry credentials on the box, image tagging.
- **Solves:** removes all build load from production; rollback becomes re-pointing at
  a prior image tag — fast, and no rebuild.
- **Requires:** infra-repo changes (compose must consume `image:` rather than
  `build:`), which is **blocked while the infra PAT is read-only**.
- **Also requires:** replacing the type-check gate that `next.config.mjs:41-46`
  currently relies on the on-box build to provide.

### Option C — x86 runner with QEMU emulation — **ruled out**

Dominated by Option B now that native ARM64 runners are GA for private repos
(2026-01-29). Community reports put QEMU-emulated compiled workloads at 4–5× slower.
Retain only if the account's plan turns out not to offer ARM runners.

## Open risk on Option B — **resolved 2026-07-27, conditionally** (D-09)

The risk was that a `docker pull` executed on the EC2 box, outside Actions, might be
metered — on a box that exists specifically because a metered-egress bill arrived
unannounced.

**Resolved: it is free, but only if the package's own visibility is Public.**
`[verified]` "GitHub Packages usage is free for public packages", stated without any
Actions-only qualifier.

**The condition is not automatic and is the single most failure-prone step in rollout.**
`[verified]` a first publish defaults to **private**; a package linked to a public repo
inherits that repo's *access permissions* but **not** its visibility. Left private, the
**553 MB** image immediately exceeds the Free plan's **500 MB** package-storage
allowance. Rollout must flip visibility to Public **and verify it**. See D-09, including
the build-time secret audit that makes a world-pullable image safe here.

## Selector — **resolved 2026-07-27**

Which option fits depended on what the current deploy actually costs the operator. If the
pain were *"I must be at my machine"*, Option A resolved it at zero cost. The owner named
the other pain: **"production should not be compiling"** — only Option B addresses it.

**Option B selected.** See [decisions.md](decisions.md) D-04. Option A is retained above
as the fallback if U-02 proves the infra repo permanently unwritable.

## Sizing and topology — **resolved 2026-07-27** (D-07)

Option B does **not** require a larger instance, and does **not** motivate splitting
services onto separate instances.

| Question | Answer | Because |
|---|---|---|
| Upsize past `t4g.small`? | **No** | The build spike was the only workload exceeding a 1.8 GiB envelope. B removes it from the box. Runtime `standalone` Next.js is a thin Node server. |
| Disk pressure? | **Improves** | 74% full / 7.3 G free today, with a 10.34 GB build cache that only exists because the box builds. Under B it is deletable — a rollout step. |
| One EC2 per service? | **No** | Multiplies compute, EBS and Elastic IPs; needs per-service TLS or an ALB; converts free loopback traffic into metered cross-instance egress — the exact shape of the $138 bill the box was created to escape. |

Note the host is **`t4g`** (Graviton/ARM64), not `t4`. That is why the build target is
`ubuntu-24.04-arm` and why Option C was ruled out.
