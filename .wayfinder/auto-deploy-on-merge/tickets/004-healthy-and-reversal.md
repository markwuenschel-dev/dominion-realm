---
id: 4
title: "What counts as a healthy deploy, and how is an unhealthy one reversed?"
type: grilling
state: open
claimed_by: ""
decision_owner: ""
blocked_by: [2]
created: 2026-07-27
closed: null
---

## Question

What signal makes a deploy "succeeded" rather than merely "finished", and what is the
reversal path when that signal fails — automatic or operator-triggered?

## Context

- Today's check accepts **any** HTTP response within 30 s and never asserts the status
  code (`scripts/deploy.ps1:104-110`). A 500 error page passes it. It also asserts
  nothing about *which build* is being served.
- There is **no automated rollback**. A failed check throws in the operator's terminal
  and the new container keeps running. Documented recovery is re-running the script
  with a prior ref, which triggers a fresh build of the old code
  (`deploy.ps1:10-11`, `:62-66`).
- No ADR, README, or guide describes rollback anywhere — this axis is undocumented, not
  merely undecided.
- The health target is `https://dominionrealm.44-198-76-44.nip.io`
  (`deploy.ps1:41`), not the `thedominionrealm.com` the docs name. A pipeline that
  hardcodes the documented domain would probe a host that does not resolve.
- No concurrency guard exists anywhere: neither `deploy.ps1` nor any workflow prevents
  two deploys overlapping on the same clone.

Blocked by [Where does the image build](002-build-location.md): reversal means
"redeploy a prior git ref and rebuild" if the box builds, or "re-point at a prior image
tag" if CI builds. Those are different mechanisms with different recovery times.
