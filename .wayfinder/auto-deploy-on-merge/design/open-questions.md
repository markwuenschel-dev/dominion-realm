# Open questions — triggered deploy pipeline

State: `open` · `answered` · `deferred`. Owner defaults to **markwuenschel-dev**.

## Blocking the contract

| ID | Question | Route | State |
|---|---|---|---|
| U-01 | What does the current deploy actually cost the operator — being tied to one machine, lack of an audit trail, or the box's build load? | Round 1 Q1 | **answered** → the build load. Option B selected; see D-04. |
| U-02 | Is changing the infra repo in scope, given its PAT is read-only and push-blocked? | Round 1 Q2 | **answered** — owner granted the infra credential read+write, 2026-07-27. Blocker cleared; infra repo is in scope. See D-08. |
| U-03 | If the target commit's CI run isn't green, does the pipeline refuse, warn, or not check? | Round 1 Q3 (ticket 003) | **answered — WARN.** Advisory only, never blocking; the operator stays the gate. See D-05. |
| U-04 | Against a stopped box: fail fast or auto-start? May the pipeline ever *stop* the box? | Round 1 Q4 (ticket 006) | **answered — auto-start; never stop.** Amends D-02 to permit a scoped AWS role. See D-06, incl. the budget kill-switch interlock. |
| U-05 | Is spend a hard constraint, or is a few dollars a month acceptable to move builds off production? | Round 1 Q5 | **answered — hard constraint.** Moot as costing (Option B is $0, D-04); binds the interlock, which fails closed. See D-10. |

## Raised by D-06, owed before rollout

| ID | Question | Route | State |
|---|---|---|---|
| U-11 | How does auto-start avoid resurrecting a box the **budget kill switch** deliberately stopped? `[verified]` the action is **built and armed** — `STOP_EC2_INSTANCES`, `AUTOMATIC` approval, `STANDBY`, on `i-018796c951839031d`, at $50 actual. | Delivery must fail closed: check kill-switch state before starting | open — **safety interlock, blocks rollout of auto-start** |
| U-12 | ~~What implements the nightly idle-off?~~ | — | **answered `[verified]`** — EventBridge Scheduler `nightly-stop-shared-box`, `cron(0 4 * * ? *)` America/New_York, ENABLED, target `ec2:stopInstances`. **No matching start schedule exists.** Residual: refuse/warn on a deploy triggered just before 04:00 ET. |

## Needs measurement, not opinion

| ID | Question | Route | State |
|---|---|---|---|
| U-06 | Is a `docker pull` on the box, outside Actions, billed as GHCR data transfer? Docs do not classify it. | GitHub support, or one controlled test | **answered, conditionally** — free **iff the package's own visibility is Public**. "GitHub Packages usage is free for public packages" carries no Actions-only qualifier. The condition is not automatic: see D-09. |
| U-07 | How long does an on-box build take, and what is its peak memory against 184 MiB idle headroom? | One timed build during a quiet window, with owner consent | **retired** by D-04/D-07 — under Option B the box never builds, so the figure stops being load-bearing |
| U-08 | What is the account's GitHub plan? Free/Pro/Team/Enterprise changes included minutes (2,000 / 3,000 / 50,000) and GHCR quotas materially. | Owner, or billing API | **answered — GitHub Free**, `[verified]` via `gh api …/infra/branches/main/protection` → 403 "Upgrade to GitHub Pro". Consequences below. |

## Deferred by ruling

| ID | Question | Why deferred |
|---|---|---|
| U-09 | Should `main` carry branch protection? | Owner ruled it a separate effort (D-03) |
| U-10 | Should a deploy-scoped identity replace the shared key? | Owner ruled reuse (D-02) |

## Surfaced here, owned elsewhere

- **A plaintext PAT sits in `/opt/stack/infra/.git/config`** on the box. Not this
  contract's decision; flagged to the owner for rotation on its own schedule.
- **Production ships with no analytics and social URLs on an unregistered domain**,
  because the build stage receives no environment. Delivery work; the *mechanism* that
  prevents recurrence is ticket 001.
- **`SPEC.md` documents a `t4g.medium` with 4 GB RAM**; the live box is a `t4g.small`
  with 1.8 GiB. The infra repo's build-sizing rationale is written against memory that
  does not exist.
- **The Caddyfile contains no `thedominionrealm.com`** — only `nip.io` hostnames and a
  commented template using `dominionrealm.com`, without the "the". The code's fallback
  URL disagrees with both.
