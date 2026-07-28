---
id: 3
title: "What must be true about a commit before the pipeline will deploy it?"
type: grilling
state: closed
claimed_by: "mark-cc-0727a"
decision_owner: "markwuenschel-dev"
blocked_by: []
created: 2026-07-27
closed: 2026-07-27
---

## Resolution

**The pipeline checks, warns, and deploys anyway.** Advisory, never blocking — the
operator who triggers the deploy remains the gate. Recorded as
[D-05](../design/decisions.md).

Consistent with D-01 (deploys are explicitly operator-triggered) and D-03 (gate
enforcement at GitHub is a separate effort). No override input is needed, because nothing
blocks.

This ticket's own framing is confirmed correct and an earlier draft of D-05 was wrong:
CI **does** run on `push: branches: [main]` (`ci.yml:9-10`), so a conclusion for the
deployed SHA almost always exists and the warning carries real information. The comment
at `next.config.mjs:41-46` claiming "CI runs only on pull requests" is stale.

Four states must be distinguished, not two — green, red, **cancelled**, and no-run. The
cancelled case is live: `ci.yml:17-19` sets `cancel-in-progress: true` on
`ci-${{ github.ref }}`, so back-to-back pushes to `main` leave the earlier SHA cancelled.
Per this ticket's context, the warning must reflect **`verify`**, not the run aggregate —
`a11y` is `continue-on-error` (`ci.yml:112`) and `scene-joins` is off the push path
(`ci.yml:124`).

Accepted weakness: a warning in an unread log is not a gate. Delivery must surface it as a
`::warning::` annotation plus a job-summary block, or this ruling has selected "no check"
while paying for "refuse".

## Question

Given that enforcing gates at GitHub is out of scope for this map, does the deploy
pipeline itself verify anything about the commit it is about to ship — and if so, what?

## Context

- `main` has **no branch protection** (`gh api …/branches/main/protection` → 404), and
  the driver ruled that adding it is a separate effort.
- `scripts/deploy.ps1` never consults CI. It hard-syncs `origin/main` and rebuilds
  whatever is there, green or red (full read, 2026-07-27).
- CI does run on push to `main` (`.github/workflows/ci.yml:7-15`), so a conclusion for
  the deployed SHA usually exists — the pipeline could query it.
- `verify` is the only real gate; `a11y` is `continue-on-error` (`ci.yml:112`) and
  `scene-joins` is off the push path by design (`ci.yml:124`).
- Today the on-box Docker build is a de-facto backstop, because `pnpm build` runs
  `tsc` (`next.config.mjs:41-46`). Whether that backstop survives depends on
  [Where does the image build](002-build-location.md), but the question of what the
  *pipeline* checks is independent of where the build runs.

Options worth pricing: no check (trust the operator's explicit trigger); require the
SHA's CI run to have concluded successfully; require it only for non-operator-authored
commits.
