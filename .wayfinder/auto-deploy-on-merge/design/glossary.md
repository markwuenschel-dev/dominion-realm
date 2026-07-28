# Glossary — triggered deploy pipeline

One term, one concept. Terms listed as *avoid* are ambiguous in this context and should
not appear in the contract.

**Deploy.** Replacing the running `dominion-realm` container with one built from a
chosen git ref, and confirming the public URL serves it. *Avoid:* "release", "ship",
"push" — the last is already git's word and would blur D-01.

**Trigger.** The explicit operator act that starts a deploy. Under D-01 a trigger is
never a git event. *Avoid:* "deploy on merge".

**The box.** EC2 instance `i-018796c951839031d` (`shared-box`, `t4g.small`), reachable
at Elastic IP `44.198.76.44`. Runs four production apps, Caddy, and Postgres under one
Compose project named `stack`. *Avoid:* "the server", "prod" — both read as
single-tenant, and it is not.

**The stack.** The Compose project in `/opt/stack/infra` covering all six services.
Distinct from **the service**, which is `dominion-realm` alone. A deploy touches the
service; a mistake can touch the stack.

**Build location.** Where `pnpm build` executes — on the box, or on a CI runner. The
axis of ticket 002. *Avoid:* "where it deploys", which conflates build with release.

**Green.** A concluded successful CI `verify` run for a specific commit SHA.
Deliberately narrow: the `a11y` job is advisory (`ci.yml:112`) and `scene-joins` never
runs on that path (`ci.yml:124`), so neither contributes to "green".

**Healthy.** A property of a deploy, not of a commit: the public URL serves the newly
deployed build. Today's probe proves neither half — it accepts any HTTP status and
asserts nothing about which build answered.

**Reversal.** Returning production to a previously-good state. Its mechanism depends on
build location: redeploy-and-rebuild a prior ref if the box builds, or re-point at a
prior image tag if CI does. *Avoid:* "rollback" unqualified, which implies the second
and is not currently true.

**Powered off.** A normal, deliberate state for the box — not an incident. Stopping is
operator-initiated today and may become budget-initiated if the drafted kill-switch in
`/opt/stack/infra/aws/kill-switch.md` is ever armed.
