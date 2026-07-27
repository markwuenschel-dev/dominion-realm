---
id: 5
title: "How does the deploy credential reach CI without widening blast radius?"
type: grilling
state: open
claimed_by: ""
decision_owner: ""
blocked_by: [2]
created: 2026-07-27
closed: null
---

## Question

Given the ruling to reuse the existing `shared-box.pem` access model, how is that
credential made available to a CI run, and what constrains what a run can do with it?

## Context

The driver ruled (2026-07-27) that automation reuses the existing access model rather
than provisioning a new deploy-scoped identity or an SSM/OIDC path. That prunes the
transport question to credential *delivery* and *containment*.

What that key reaches, verified on the box 2026-07-27: the `ubuntu` user on a host
running **four production apps plus Caddy and a shared Postgres**. It is not scoped to
this app. Anything holding it can act on the whole stack.

Current GitHub-side state:

- **Zero** Actions secrets configured (`gh api …/actions/secrets` → `total_count: 0`).
- **Zero** self-hosted runners (`…/actions/runners` → `total_count: 0`), so a run must
  egress from a GitHub-hosted runner.
- `allowed_actions: "all"`, `sha_pinning_required: false` — any third-party action at
  any ref may run in the same job that holds the secret.
- Three GitHub Environments already exist, none referenced by any workflow and none
  carrying protection rules.

Live containment levers worth pricing: an Environment with required reviewers and
scoped secrets; restricting `allowed_actions`; SHA-pinning; keeping the key out of
GitHub entirely and having CI only *signal* a deploy that the box pulls.

Blocked by [Where does the image build](002-build-location.md): a CI-built image needs
registry credentials in addition to (or instead of) host access, which changes what is
being contained.
