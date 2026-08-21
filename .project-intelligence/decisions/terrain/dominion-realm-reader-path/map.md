# Decision terrain — Dominion Realm reader-acquisition & engagement

Destination: convert visitors into readers of *Realmwalkers · Book One* (primary) while
retaining active readers through a spoiler-safe companion layer (secondary), without
drifting into a standalone game / wiki / social network / spoiler-compromising lore dump.

Chart published: 2026-08-20. Round 1 resolved: 2026-08-20.
Artifact (current state): https://claude.ai/code/artifact/58cbbe86-2750-4b15-9886-3dea886cd4f7

## Evidence startup

WARM_START. Reused: README.md, CONTEXT.md, docs/prd/site-overhaul.md,
docs/adr/0001–0014 (all titles read; 0003/0004/0006/0007 read in full),
src/lib/cta.ts, src/components/BuyCta.tsx, src/content/* directory counts. Zero
scouts dispatched. Prose/chapter content and infra/deploy-alarm status (tracked in
prior session memory) explicitly out of scope for this map.

## Owner-set resolution sequence

`RV-1 / RV-3` → `CF-3 + companion CTA copy` → `M-1 / CF-1` → `CW-1` → `CW-2 / OO-2`

This is the author's stated execution order, not a logical-dependency inference —
supersedes the tool's originally-inferred "unlocks" chain below.

## Tickets — all ANSWERED, round 1

Owner: author (product/taste call) · tech (implementation, product-defined) · joint.

### Bedrock (settled, cited above; not tickets)
Site shape (ADR-0003) · reveal-tier mechanics (ADR-0004) · visual identity (ADR-0007) ·
content schema/CMS (ADR-0002/0009) · media layer (ADR-0011/0013/0014) · Kit/GA4 wiring
(ADR-0005/0006) · EC2/Caddy hosting (ADR-0012).

### IA — Information architecture
- **IA-1** ANSWERED · author — Accepted, modified. `/read` becomes the visibly primary nav action, labeled "Read the Free Sample" / "Start Reading." Companion routes stay peer-available, visually secondary.
- **IA-2** ANSWERED · author — Accepted. Homepage scroll ends on one primary CTA: "Read the Free Sample." Secondary "Explore the world" link allowed, must not visually rival it.
- **IA-3** ANSWERED · joint — Accepted, modified. `/codex /map /eyes /interface` get a persistent, compact "Start Reading" affordance in shared chrome (not footer-only, not a mode switch). `/journal` exempted from companion framing.

### RV — Spoiler / reveal policy
- **RV-1** ANSWERED · author — Accepted, modified. Tiers defined: teaser = pre-sample-safe; reader = safe after Prologue+Ch.1 only; deep = safe after Book One; beyond = later-series. Selector copy → "Finished the free sample." **Guardrail: never retag existing teaser entries to populate reader tier — add genuinely new reader-only material instead.**
- **RV-2** ANSWERED · author — Accepted. Tool shells (Eyes/Interface/map) stay globally open; all narrative content/labels/metadata/linked targets inside them obey reveal gating — including shell copy itself.
- **RV-3** ANSWERED (interim) · author — Owner-intent-required on the written rule's substance; immediate process: until it exists, only the author may raise a reveal tier, all other contributors default to teaser or require review. Needs worked examples + "when uncertain, more restrictive" default.

### CW — Content workflow
- **CW-1** ANSWERED (deferred) · author — Owner-intent-required. No cadence promised against novel-writing capacity. Until chosen: retention treated as opportunistic, not a committed outcome.
- **CW-2** ANSWERED · joint — Accepted: manual deploys stay. Revisit trigger: a cadence is adopted (CW-1), or two planned releases miss their window due to manual deploy.

### CF — Conversion funnels
- **CF-1** ANSWERED · author — Accepted. Consented signups segment by intent: minimum `launch_interest` vs `world_updates`, tagged with stable source surface. No extra profile data.
- **CF-2** ANSWERED · joint — Accepted, modified. Reuses IA-3's companion affordance; no newsletter pitch injected site-wide — quiet opt-in only at natural completion points.
- **CF-3** ANSWERED · author · high leverage — Accepted strongly. End-of-sample handoff: (1) acknowledge sample ended, (2) primary — preorder/buy when live else `launch_interest` signup, (3) secondary — explore reader-safe companion content. Instrument via M-1; no stacked competing CTAs.

### IF — Interactive-feature scope
- **IF-1** ANSWERED · author · most consequential — Accepted. Eyes frozen at current mechanical depth: no progression/save/economy/new subsystems. Reframed as "experience the interface." Growth not authorized now; future acquisition evidence could reopen it.
- **IF-2** ANSWERED · author — Accepted, modified. Constellation stays complete and factually truthful within chosen reveal tier — never distort topology or hide safe relationships for funnel behavior. Steer via default tier + IA-3 affordance + curated entry points only.
- **IF-3** ANSWERED (with an open sub-thread) · author — Accepted, with wording constraint. Record the map as a deliberate scope change (why accepted / outcome served / what displaced) in an ADR addendum. **"Retroactively approved" explicitly rejected as documentation language — must not launder scope drift.**
- **IF-4** ANSWERED · joint — Accepted. Standing rubric adopted verbatim: a feature must directly support acquisition or spoiler-safe companion value, stay bounded from standalone-game behavior, and carry an owner-approved opportunity cost.

### M — Measurement
- **M-1** ANSWERED · tech (product-defined) — Accepted, modified, framed as privacy/semantics not just implementation. Post-consent events: `sample_started`, `sample_completion_reached`, `primary_cta_clicked` (surface+intent), `newsletter_intent_submitted`, `reveal_tier_changed` — no personal/spoiler payloads.
- **M-2** ANSWERED (deferred) · author — Owner-intent-required. Interim candidate: consented returning-visitor rate over a defined window, treated as a proxy. Real choice waits on CW-1.

### OO — Operational ownership
- **OO-1** ANSWERED · author — Accepted, sequenced after RV-3. Author-only tier changes until the written policy exists; afterward non-author changes need a proposed tier + review.
- **OO-2** ANSWERED (deferred) · author — Owner-intent-required, sequenced after CW-1. No cadence → no SLA. If a cadence is adopted, it must ship paired with a same-window deploy commitment owned by a named person.

## Open follow-up (not a new ticket — a documentation input gap)

**IF-3 sub-thread:** the ADR addendum needs "what building the interactive map
displaced" to be factually true, and that fact isn't in any evidence read this
session — the repo shows the map shipped, not its opportunity cost. Needs the
author's own recollection before the addendum can be written without guessing.
Flagged back to the author in-conversation; not blocking anything else on this map.

## Frontier

Round 1 complete — all 18 tickets answered (12 clean accepts/modifications, 4
deliberately deferred with an interim rule pending an upstream decision, 1 interim
process rule pending a written policy). No unaddressed lens from the original
brief. Remaining work from here is execution (nav copy, companion chrome, GA4
events, the ADR addendum, Kit segmentation), which sits outside this map's
authority — DTM records decisions, it does not implement them.

## Interaction mode note

User's global preference (one fork at a time, visual-led) governed forks 1–2;
user then explicitly asked to "dump them all," so forks 3–7 were delivered in one
batch per their request, not the tool's default.
