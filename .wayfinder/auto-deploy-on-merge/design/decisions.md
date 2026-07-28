# Decisions — triggered deploy pipeline

`implementation_authorized: false`. Decision owner: **markwuenschel-dev**.
Nothing here is approved until the owner says so; entries below marked RULED are
owner rulings already given in this effort.

---

## D-01 — RULED · No commit auto-deploys

**Decision.** Deploys are triggered explicitly by the operator. No push to `main`,
from any author, causes a deploy.

**Rationale (owner, 2026-07-27).** "I'll specify when to deploy, or if this rule
changes."

**Consequences.** The trigger is `workflow_dispatch` (or equivalent), not `push`.
Keystatic's direct-to-`main` commit path stops being a deploy concern. The author-facing
promise at `docs/CONTENT.md:321` — "Merging into `main` triggers the deploy" — is
**wrong under this ruling** and must be corrected by delivery.

**Revisit trigger.** The owner states the rule has changed.

---

## D-02 — RULED · Reuse the existing box access model

**Decision.** Automation reuses the existing `shared-box.pem` access model. No new
deploy-scoped user, no separate key, no SSM or OIDC federation path.

**Rationale (owner, 2026-07-27).** Direct ruling.

**Consequences.** The credential reaching CI grants `ubuntu` on a host running four
production apps, Caddy, and a shared Postgres. Containment therefore has to come from
*around* the credential — environment protection, action allow-listing, SHA pinning —
rather than from scoping the credential itself. Tracked as ticket 005.

**Revisit trigger.** A second maintainer joins, or the box stops being single-tenant
in a way that makes shared `ubuntu` access unacceptable.

---

## D-03 — RULED · Gate enforcement at GitHub is out of scope

**Decision.** Adding branch protection or required status checks on `main` is a
separate effort, not part of this contract.

**Rationale (owner, 2026-07-27).** Direct ruling.

**Consequences.** "Green" cannot be enforced at merge time. If the pipeline is to
verify anything, it must do so itself, at trigger time. Tracked as ticket 003.

---

## D-04 — RULED · Build location: Option B, build in CI on a native ARM runner

**Decision.** The image is built by GitHub Actions on `ubuntu-24.04-arm` and shipped to
the box through GHCR. The box pulls and restarts; it does not compile.

**Rationale (owner, 2026-07-27).** Owner selected Option B against the U-01 selector.
The operative pain is **"production should not be compiling"**, not merely
machine-tethering — the owner had already downsized the instance to reduce cost, and the
build is the one workload that does not fit the resulting envelope.

**Consequences.**
- The type-check gate **moves rather than disappears** — corrected 2026-07-27.
  `next.config.mjs:47-53` sets no `typescript.ignoreBuildErrors`, so `next build`
  type-checks by default; the comment at `:41-46` explains why that is deliberately left
  on. Under Option B that same `next build` runs inside the CI image build, so a type
  error **fails the workflow and no image is produced** — the gate now fires *before*
  production is touched instead of during a deploy. It is strengthened, not lost. The
  earlier framing here ("a replacement gate must be named") was wrong. What ticket 003
  must still decide is whether the pipeline additionally consults the *repo's* CI status
  for the target commit — a separate question from the build's own type-check.
- The infra repo's `docker-compose.yml` must consume `image:` instead of `build:`. That
  repo's remote is **push-blocked with a read-only PAT** — a blocker on B's critical
  path, escalated as U-02.
- Registry surface is new: `packages: write` in CI, registry credentials on the box,
  and an image-tagging scheme. Feeds ticket 005.
- Rollback improves: re-point at a prior image tag rather than redeploy-and-rebuild.
- **Build caching must be rebuilt in CI, or every build is cold.**
  `Dockerfile.dominion-realm:16-17,:21-22` leans on BuildKit cache mounts for the pnpm
  store and Next's compile cache. Those live on the box and are forfeited by moving the
  build. Delivery must supply an equivalent — GitHub Actions cache or a registry-backed
  BuildKit cache — or accept a full cold compile per deploy. Free runner minutes (see
  cost, above) make this a wall-clock concern, not a billing one.
- **Unretired risk:** U-06 — whether a `docker pull` executed on the box, *outside*
  Actions, is billed as GHCR data transfer. Unmeasured. This lands on the same nerve as
  the $138 egress bill that caused the box to exist. Selecting B does not resolve U-06;
  it makes resolving it mandatory before rollout.

**Revisit trigger.** U-06 measures materially non-zero, or the infra repo proves
permanently unwritable.

---

## D-07 — RULED · Instance stays `t4g.small`; topology stays one shared box

**Decision.** No instance upsize accompanies this change, and services are **not** split
onto separate EC2 instances. Six containers remain under one Compose project on one
`t4g.small` behind one Caddy.

**Rationale (owner question, 2026-07-27).** The owner asked whether Option B forces a
larger box or per-service instances. It forces neither — B is what makes the downsize
safe, by removing the only workload that did not fit.

**Consequences.**
- Memory: the build spike was the sole workload exceeding the envelope
  (`[verified]` 1.8 GiB RAM, ~184 MiB free at idle, six containers + OS). Runtime
  Next.js under `output: 'standalone'` (`next.config.mjs:37`) is a thin Node server;
  `docker pull` plus restart is a small transient.
- Disk improves materially: the **10.34 GB** Docker build cache becomes deletable once
  the box stops building, against **7.3 G free / 74% full** today. Reclaiming it is a
  rollout step, not an optional cleanup.
- Splitting to per-service instances was rejected as actively counter-productive:
  it multiplies compute and EBS, requires per-service TLS termination or an ALB,
  converts today's free loopback traffic between co-located services into **metered
  cross-instance egress**, and bills the extra Elastic IPs. That is the exact cost shape
  the box was created to escape.

**Free-vs-available, resolved.** The earlier `[assumed]` is settled by ticket 002's own
record: with all six containers up, **623 MiB was available** — the ~184 MiB figure was
the narrower *free* column. The runtime envelope is roomier than the tightest reading
suggested, which strengthens rather than weakens this decision. Peak on-box build memory
(U-07) is retired regardless: under Option B the box never builds.

**Revisit trigger.** A single service's runtime footprint grows enough to threaten its
co-tenants, or an availability requirement demands isolation.

---

## D-08 — RULED · The infra repo is in scope and editable via git

**Decision.** `docker-compose.yml` and `Dockerfile.dominion-realm` are changed in
`markwuenschel-dev/infra` through normal git, not hand-edited on the box.

**Rationale (owner, 2026-07-27).** The owner granted the infra credential read+write.
The prior 403 is retired. Independently `[verified]`: the owner's identity already held
`admin`/`push` on `markwuenschel-dev/infra` (`gh api repos/markwuenschel-dev/infra`) —
the block was a property of the box's stored credential, never of the repo.

**Consequences.** Option B's required edit (compose consumes `image:` rather than
`build:`) has a supported path. Routes B2 (untracked on-box edit) and B3 (move the
compose fragment into `dominion-realm`) are not taken. The infra repo remains the single
source of truth for all six services.

**Still owed, separately.** The credential in `/opt/stack/infra/.git/config` is plaintext
on disk. Read+write raises the stakes of that exposure rather than lowering them. Its
storage — credential helper, deploy key, or otherwise — is delivery/ops work, tracked
outside this map.

**Revisit trigger.** The infra repo becomes unwritable again, or gains a second consumer
whose release cadence conflicts.

---

## D-09 — RULED · The GHCR package is published **Public**, explicitly

**Decision.** The `dominion-realm` container package's own visibility is set to **Public**
at first publish. This is what makes Option B free; it is not a default.

**Rationale.** `[verified]` "GitHub Packages usage is free for public packages"
([billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages)),
with no Actions-only qualifier — so the box-side `docker pull` is free. This retires
U-06, Option B's one live financial risk.

**The trap this decision exists to prevent.** `[verified]` "When you first publish a
package that is scoped to your personal account, the default visibility is **private**"
([access control and visibility](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)).
A package linked to a public repo inherits the repo's *access permissions* but **not its
visibility**. So publishing from public `dominion-realm` lands a **private** package by
default, against a Free-plan quota of **500 MB storage / 1 GB transfer per month** — which
the **553 MB** image busts on the very first push. Rollout must flip visibility, and must
verify it flipped; this is not a step that can be assumed to have happened.

**Irreversible.** `[verified]` "Once you make a package public, you cannot make it
private again." Accepted deliberately — see the secret audit below.

**Secret audit — why a publicly pullable image is safe here.** `[verified this session]`
the build stage needs **no** server-side secret:
- `SANITY_API_READ_TOKEN` is referenced **nowhere in `src/`**. It is defined in the on-box
  env file but no application code reads it.
- `SANITY_REVALIDATE_SECRET` is read only at **runtime**, in the route handler
  `src/app/api/revalidate/route.ts:20`.
- Everything the build genuinely needs is `NEXT_PUBLIC_*`, which is public by definition
  and already shipped in client bundles.

Therefore no secret is baked into a layer. **This becomes a standing constraint:** ticket
001's build-time config mechanism may pass `NEXT_PUBLIC_*` only. Any future need for a
server-side secret at build time reopens D-09, because the image is world-pullable.

**Unresolved, non-blocking.** `[UNRESOLVED]` no official numeric GHCR pull rate limit was
found — an absence-of-evidence finding, not a documented guarantee. Deploy frequency here
is low enough that it does not gate rollout.

**Revisit trigger.** The build acquires a server-side secret dependency, or GitHub
changes public-package billing.

---

## D-05 — RULED · Pre-deploy verification is **advisory (WARN)**, never blocking

**Decision.** The pipeline reads the target commit's CI status and **surfaces** it. It
does **not** refuse to deploy on a red or missing status. The human operator remains the
gate.

**Rationale (owner, 2026-07-27).** Owner selected WARN over REFUSE and over
DON'T-CHECK. Consistent with D-01 (deploys are explicitly operator-triggered) and D-03
(gate enforcement at GitHub is a separate effort): the operator who types the trigger is
the decision-maker, and the pipeline's job is to inform that decision, not to overrule it.

**Consequences.**
- The workflow needs read access to the commit's check status, but **no** hard-fail
  branch. No override input (`force:`) is required, because nothing blocks — this is
  strictly simpler than REFUSE.
- **The known weakness, accepted deliberately:** a warning written into a log nobody
  reads is not a gate. This ruling is only sound if the warning is genuinely hard to
  miss. Delivery must therefore surface status somewhere unmissable — a
  `::warning::` annotation and a job-summary block on the run page at minimum — not a
  line buried in step output. If the warning is easy to miss, this decision has
  effectively selected DON'T-CHECK while paying REFUSE's implementation cost.
- Distinguish four states, not two: **green**, **red**, **cancelled**, and **no run /
  still queued**.
  - `[verified]` **a status will almost always exist.** CI triggers on
    `push: branches: [main]` (`.github/workflows/ci.yml:9-10`), not only on pull requests.
    An earlier draft of this decision claimed the opposite and was wrong; so is the
    comment at `next.config.mjs:41-46` that asserts "CI runs only on pull requests" —
    that comment is stale. This makes WARN more useful than first assessed: the warning
    will carry real information nearly every time.
  - **`cancelled` is a live case, not a theoretical one.** `ci.yml:17-19` sets
    `concurrency: ci-${{ github.ref }}` with `cancel-in-progress: true`, so two pushes to
    `main` in quick succession leave the first SHA's run **cancelled** — neither green nor
    red. Deploying that SHA must report "cancelled", not "failed".
  - `verify` is the only real gate; `a11y` is `continue-on-error` (`ci.yml:112`) and
    `scene-joins` is off the push path (`ci.yml:124`). The warning should reflect
    `verify`'s conclusion, not the run's aggregate, or an advisory a11y failure will read
    as a deploy-blocking red.
- Independently of this, the image build **is** a real gate and is unaffected: `next
  build` type-checks, so a type error fails the workflow and no image is produced (D-04).
  WARN governs only the *repo's* CI status — tests, lint, a11y — which the build does not
  cover.

**Revisit trigger.** A deploy ships a defect that a red status had already flagged, or
branch protection lands and makes merge-time enforcement available.

---

## D-06 — RULED · Auto-start a stopped box; **never** stop it

**Decision.** When the trigger fires against a `stopped` instance, the pipeline starts it,
waits for `running` plus a reachable sshd, then deploys. The pipeline **never** issues a
stop.

**Rationale (owner, 2026-07-27).** Owner selected auto-start. The box is powered off most
of the time — an owner-run nightly idle-off stops it every night, "until I need services
running 24/7" — so a stopped box is the **normal** state at trigger time, not an edge
case. Fail-fast would make every deploy a manual two-step and reintroduce the operator
friction Option B exists to remove.

**Auto-stop stays ruled out.** The instance hosts five other production services
(`realmwalkers`, `perf-lab-api`, `leave-sprint`, `caddy`, `pgvector/pgvector:pg16` —
`docker-compose.yml:32-106`). A deploy of one service must not power-cycle the host for
the other five. The nightly idle-off already owns scheduled shutdown; the pipeline does
not duplicate it.

**Consequences.**
- **This amends D-02.** That ruling ("no new deploy-scoped identity, no SSM or OIDC path")
  governed *box* access. Auto-start requires **AWS API** access — a different axis — so
  CI additionally gets an AWS credential scoped to start this one instance. Note the
  privilege ordering: that role is *smaller* than the SSH key D-02 already permits, which
  grants full `ubuntu` on a six-service host.
- **A precedent for its exact shape already exists in the infra repo.**
  `aws/kill-switch.md` defines `budget-killswitch-role` — trusts a service principal,
  scoped to `ec2:StopInstances` on **only this instance ARN**, plus `ec2:DescribeInstances`
  / `ec2:DescribeInstanceStatus`. The deploy role should mirror it with
  `ec2:StartInstances` on the same single ARN. Copy the pattern; do not invent one.
- **`[verified]` the site self-heals after a stop/start.** Every service, `dominion-realm`
  included, carries `restart: unless-stopped` (`docker-compose.yml:95`), so containers
  return when the daemon comes back. Auto-start does not need to re-run compose to restore
  the *other* five services.
- **`[verified]` the compose edit Option B needs is confirmed present.** `dominion-realm`
  is declared with `build: { context: ../dominion-realm, dockerfile:
  ../infra/Dockerfile.dominion-realm }` at `docker-compose.yml:91-94`. That block becomes
  `image:`.
- The Elastic IP `44.198.76.44` stays associated across stop/start, so no DNS churn.
- Cost of the wait: roughly a minute of runner time per deploy, which is free on a public
  repo (D-04).

**⚠ Safety interlock — the one genuinely new risk this creates. `[verified this session]`,
not hypothetical.** The kill switch is **built and armed**:

```
aws budgets describe-budget-actions-for-budget --budget-name kill-switch
→ Type: RUN_SSM_DOCUMENTS · Sub: STOP_EC2_INSTANCES · Approval: AUTOMATIC
  Status: STANDBY · InstanceIds: [i-018796c951839031d]
```

`STANDBY` means armed and not currently triggered. Three budgets exist: `My Zero-Spend
Budget` ($1), `monthly-cost-guardrail` ($30), `kill-switch` ($50).

So at $50 actual spend, AWS stops this instance automatically, with no human in the loop —
and an unconditional auto-start would **silently defeat it**: the budget stops the box, the
next deploy starts it again, and the runaway resumes. This is the exact failure the box was
built to prevent. **Delivery must fail closed**: before starting, the pipeline checks
whether the kill switch has fired (budget action state, or an equivalent signal) and
refuses to start when it cannot tell the difference between a deliberate stop and the
nightly idle stop.

**The nightly idle-off, `[verified this session]`.** It is **not** in the infra repo — it
is an EventBridge Scheduler schedule:

```
aws scheduler get-schedule --name nightly-stop-shared-box
→ cron(0 4 * * ? *)  America/New_York · ENABLED
  Target: arn:aws:scheduler:::aws-sdk:ec2:stopInstances → i-018796c951839031d
```

**04:00 America/New_York, daily.** Consequences: (a) a deploy triggered in the minutes
before 04:00 ET can be stopped mid-flight — narrow, but delivery should refuse or warn
inside that window; (b) there is **no matching start schedule** — `list-schedules` returns
this one entry only — which confirms the box stays off until something starts it, and is
why auto-start is the right ruling; (c) the schedule stops the instance directly via the
AWS SDK target, so it leaves no application-level trace for the pipeline to read.

**Note on tooling vs. credentials.** The owner has the AWS CLI locally, and GitHub-hosted
runners ship it preinstalled — so the CLI is not the gap. The gap is that a local CLI
profile does not travel to CI; the scoped role above is what CI actually needs.

**Revisit trigger.** The box moves to 24/7 operation, at which point auto-start becomes
dead code rather than the normal path.

---

## D-10 — RULED · The auto-start interlock **fails closed**

**Decision.** If the pipeline cannot positively confirm that a stopped box was stopped by
the nightly schedule, it **refuses to start** and reports why. It never starts on an
unconfirmed state.

**Rationale (owner, 2026-07-27).** Owner ruled fail-closed. Consistent with observed
posture: three cost controls are configured — a $1 zero-spend budget, a $30
`monthly-cost-guardrail`, and the armed $50 `kill-switch` auto-stop. Spend is a hard
constraint, and the kill switch keeps its teeth only if nothing can start the box behind
its back.

**Consequences.**
- An AWS Budgets API failure blocks a deploy the owner wanted. Accepted: the failure mode
  is a refused deploy with a stated reason, which is recoverable, versus a silently
  defeated kill switch, which is not.
- The refusal message must name the actual reason and the manual override, or fail-closed
  becomes an unexplained outage. This is delivery's obligation, not an implicit one.
- Retires U-05 as a costing question: Option B is $0 (D-04), so spend never gated the
  choice — it gates only this interlock.

**Revisit trigger.** The interlock refuses deploys often enough to be the dominant
friction, indicating the confirmation signal is too weak rather than the posture wrong.
