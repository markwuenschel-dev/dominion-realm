---
id: 6
title: "What should a triggered deploy do when the box is powered off?"
type: grilling
state: closed
claimed_by: "mark-cc-0727a"
decision_owner: "markwuenschel-dev"
blocked_by: []
created: 2026-07-27
closed: 2026-07-27
---

## Resolution

**Auto-start, then deploy. The pipeline never stops the box.** Recorded as
[D-06](../design/decisions.md); the interlock posture as D-10.

A stopped box is not merely a "normal operating state" as this ticket framed it — it is
the **scheduled default**. `[verified]` an EventBridge Scheduler schedule
`nightly-stop-shared-box` runs `cron(0 4 * * ? *)` America/New_York against
`i-018796c951839031d`, ENABLED, and **no matching start schedule exists**. Fail-fast would
therefore make nearly every deploy a manual two-step.

Auto-stop is ruled out on blast radius: this pipeline deploys one of six services and must
not power-cycle the host for the other five. Scheduled shutdown is already owned by the
schedule above.

This ticket's coupling to [005](005-credential-delivery.md) is confirmed and resolved in
principle: instance-start **is** a wider AWS permission than host access, and it **amends
D-02**, which had ruled out new identities for *box* access. Note the ordering — a role
scoped to `ec2:StartInstances` on one instance ARN is *narrower* than the SSH key D-02
already permits, which grants full `ubuntu` on a six-service host. `aws/kill-switch.md`
in the infra repo already contains the pattern to copy (`budget-killswitch-role`:
single-instance ARN, describe + one action).

**Blocking interlock, `[verified]` and armed — carried to U-11.** The `kill-switch` budget
action is *built*, not drafted: `STOP_EC2_INSTANCES`, `AUTOMATIC` approval, `STANDBY`, on
this instance, at $50 actual spend. Unconditional auto-start would silently defeat it.
Per **D-10** the interlock **fails closed**: no positive confirmation that a stop was the
nightly one means no start, with a stated reason.

Two residuals for delivery: a deploy triggered shortly before 04:00 ET can be stopped
mid-flight; and `deploy.ps1:99-101`'s misleading "partially updated" message on a stopped
box should not be reproduced in the pipeline.

## Question

The box is deliberately powered down for stretches. When a deploy is triggered against
a stopped instance, should the pipeline fail fast, start the instance and continue, or
refuse and require an explicit start?

## Context

This question exists because of an observation, not a hypothetical. On 2026-07-27 the
EC2 instance `shared-box` (`i-018796c951839031d`, `t4g.small`) was found in state
`stopped` — "User initiated (2026-07-23 21:43:17 GMT)". The public site had been
unreachable for roughly four days. The driver confirmed the shutdown was deliberate and
authorized the restart; the site returned HTTP 200 immediately after.

So a stopped target is a **normal operating state** for this host, not an incident.

Relevant facts:

- The Elastic IP `44.198.76.44` (`eipalloc-00af676f1cbcd86f7`) stays allocated and
  associated across a stop/start, so the address and the `nip.io` hostname survive.
- All six containers came back automatically on boot — every service carries
  `restart: unless-stopped` (`docker-compose.yml:33`, `:46`, `:64`, `:80`, `:95`,
  `:105`).
- Today `scripts/deploy.ps1` against a stopped box fails at the SSH step and reports
  "the box tree may be partially updated — inspect it before retrying"
  (`deploy.ps1:99-101`) — a misleading message, since nothing ran at all.
- An instance-start capability in CI is a strictly wider AWS permission than host
  access, which couples this to
  [How does the deploy credential reach CI](005-credential-delivery.md).

A secondary consideration for the same decision: an Elastic IP attached to a stopped
instance still bills, so "stopped" is not a zero-cost state.
