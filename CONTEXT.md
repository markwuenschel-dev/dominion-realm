# CONTEXT — Domain glossary

Shared vocabulary for the Dominion Realm codebase. Names good seams; keep terms
here in sync with the code. Architecture vocabulary (module, interface, depth,
seam, adapter, leverage, locality) lives in the `codebase-design` skill, not here.

## Resource system

The interactive character sheet and the standalone calculator both derive values
from a locked set of formulas in `src/lib/formulas/`. Coefficients live once in
`src/lib/constants.ts` and are consumed by the formula functions — never re-typed
at call sites.

- **Resource maxima (§1).** HP / Mana / Stamina / Reserve upper bounds computed
  from attributes: `computeResourceMaxima(attrs, soulLevelMod)` in
  `formulas/resources.ts`. Reserve alone scales by the soul-level modifier; the
  other three do not. Base maxima use `soulLevelMod = 1.0`.

- **Effective attribute (§5 seam).** A raw attribute scaled by its class
  multiplier and **rounded once** to an integer: `effectiveAttribute(raw, profile,
  attr)` in `formulas/resourceChain.ts`. That one integer drives **both** the
  sheet's attribute cell *and* the resource formula, so display and formula cannot
  disagree. Rounding happens per-attribute *before* the §1 formulas run (the sheet
  is integer-facing; the ± buttons step by 1). **LUCK is never scaled** — the seam
  returns it unchanged even for classes that list LUCK as Prime/Core/Secondary
  (Gambler, Fatewright, …).

- **Attribute view (sheet source of truth).** `describeSheetAttributes(attrs,
  profile)` in `formulas/resourceChain.ts` resolves all 11 sheet attributes to an
  `AttrView` (`{ raw, effective, multiplier, role, carried }`) **once**. It is the
  sole producer the character sheet reads: the attribute cells, the class-mods badge
  (`describeSheetRoleGroups`), the resource formula (a projection of the 10
  formula keys' `effective`), and the §7 activity-regen attribute term all read this
  one record, so they cannot disagree — agreement is structural, not incidental.
  §7 regen was the last holdout, reading raw store values until it was routed through
  the same projection; a classed sheet displayed one attribute and regenerated from
  another. New consumers of a sheet attribute should read `AttrView`, not the store
  — note this is a convention, not an enforced one: no lint rule or fitness test
  currently blocks a direct store read, so it holds only as long as reviews catch it.

- **Carried attribute.** An attribute that remains in its declared class-role group
  for identity and feature routing, but is exempt from that group's numeric attribute
  multiplier. **LUCK** is the only carried attribute today: for a class that lists it
  Prime (Gambler, Fatewright), the badge shows `LUCK ×1.00 · Carried` while the group
  rung (×1.15) still renders as a fact about the *role*. The rule lives in one place,
  `isScaleExempt(attr)`.

- **Resource core (shared pipeline).** `resourceCore(effectiveAttrs, mods, soulMult)`
  in `formulas/resourceChain.ts` is the one derivation **both** surfaces run through:
  it rounds the §1 base **once**, then applies per-resource mods (Reserve additionally
  × soul), rounding the final. Two adapters supply its inputs — `computeSheetResources`
  (the character sheet: real class profile via the effective-attribute seam + race +
  condition mods, returns the full chain with breakdowns) and `computeCalculatorResources`
  (the standalone calculator: `NEUTRAL_PROFILE` + identity mods, returns just the maxima).
  The calculator no longer reaches around the pipeline to raw `computeResourceMaxima`, so
  the two surfaces agree above the §1 leaves, not only at them; its Reserve maximum is now
  a rounded integer like every other maximum. Class influence still enters only through the
  effective-attribute seam, never as a resource-level multiplier.

- **Final resources.** The sheet's rendered maxima, produced by the resource chain
  above: base maxima × race mod × condition mod (Reserve additionally × soul
  multiplier). The base comes from the §1 seam.

- **Regen curve (§4/5).** The *safe-low* recovery curve used by the **calculator**
  — regeneration as a function of the q-ratio (current / max). Lives in
  `formulas/regeneration.ts` (`sampleRegenCurve`, `computeAllRegenResults`).

- **Activity regen (§7).** A *separate* recovery model used by the **character
  sheet** — per-activity rates (safeRest, meditation, deepSleep, travel, combat)
  scaled off the **final** resource maxima, not the q-ratio curve. Lives in
  `formulas/activityRegen.ts` (`computeActivityRegenRates`). Distinct from the
  regen curve above; the two are easy to conflate because both are "regen".

- **q ratio (§2).** `q = current / max`, clamped to [0, 1]. The input to the
  regen curve.

## Attributes

- **Attributes** — the ten formula-bearing attributes (CON, END, STR, AGI, DEX,
  INT, WIS, CHA, CVN, MYS — CVN/MYS are the Soul pair). Type `Attributes` in
  `src/types`. (The keys are the live names; `Faith`/`Occult` were the pre-rename
  keys, retired in the calculator→canon sync — see `characterSheetStore.ts`.)
- **CharacterSheetAttributes** — `Attributes` plus **LUCK**, which is tracked on
  the sheet but has no resource-formula effect in the current lock.

- **Class attribute-multiplier firewall.** Class influence enters the resource
  formulas only through per-attribute multipliers keyed by **role**: Prime ×1.15,
  Core ×1.08, Secondary ×1.03, Neutral ×1.0. `getAttrRole(profile, attr)` is the
  primitive that reports the role; `getClassAttrMultiplier` is just
  `ATTR_ROLE_MULTIPLIERS[role]`, so the ladder value lives once in
  `ATTR_ROLE_MULTIPLIERS`. Both live in `lib/classTaxonomy.ts`. The sheet's
  class-mods badge does **not** re-derive this ladder: it renders
  `describeSheetRoleGroups(attributeViews)` (`formulas/resourceChain.ts`), which
  groups the same `AttrView` records the attribute cells read — so the badge can
  never show a multiplier the cell disagrees with. (Wave 1 deleted the former
  third source, `describeClassAttrRoles`, for exactly that reason.)

- **Point budget.** Every attribute starts at the all-5s point-buy baseline
  (`ATTRIBUTE_BASELINE` in `src/lib/formulas/pointBudget.ts`). Points *spent* = each
  attribute's deviation above baseline, summed across **all** sheet attributes —
  **LUCK included** (it is a raisable attribute drawing from the same pool; the
  resource-formula firewall governs formulas, not the point economy). The pool is
  `level × pointsPerLevel`; class rarity grants no recurring bonus points.
  `computePointBudget` / `computeSpentPoints` in `formulas/pointBudget.ts`;
  `ATTRIBUTE_BASELINE` is the single source for the store's default attributes.

## Media

The picture layer, kept deliberately separate from the prose layer. Prose lives
in git Markdown (edited via Keystatic); **media** — the image files *and* the
"which picture belongs to what" links — lives in the hosted media store and is
served live, without a commit or redeploy. See [ADR-0011](docs/adr/0011-media-layer-sanity.md).

- **Subject** — any thing in the universe that can own pictures: a Character,
  Place, Faction, Concept, Item, Creature, Event, Power, Combat System, or a kind
  not yet invented. The media layer is **type-agnostic** — a Subject's `kind` is
  an open, extensible label, so a new kind of thing never re-plumbs pictures. A
  Subject is joined to its prose entry by **slug** (matched automatically; never
  typed by hand). _Avoid_: entity, entry, record.

- **Asset** — a single uploaded image file in the media store, delivered through
  the media CDN (auto webp/avif, focal-point crop). _Avoid_: file, media, picture.

- **Primary image** — the one canonical Asset per Subject, focal-point
  auto-cropped into every context (card banner, portrait, detail page) from a
  single upload. Replaces the old manual three-way CSS crop of one file.
  _Avoid_: portrait, hero, main image (those are *contexts* the Primary is cropped into).

- **Teaser-safe Primary** — the Primary image of a Teaser Subject, suitable for
  public social metadata as well as the visible page. A subject-level Teaser
  gate trusts its Primary to be spoiler-safe; per-Asset reveal tiers are outside
  the current model.

- **Site social image** — the dedicated 1200×630 landscape Asset used for public
  site-wide and sealed-entry social metadata. It belongs to `siteSettings` and
  is distinct from the portrait book cover; its static fallback is `og-default`.

- **Gallery** — the ordered list of additional Assets on a Subject beyond the
  Primary, each with its own caption and alt text. _Avoid_: album, extras.

- **Type slot** — a named, kind-specific Asset slot: **Map** (Places), **Sigil**
  (Factions), **Banner** (a wide hero distinct from the Primary). Distinct from the
  Gallery, which is an unordered-purpose ordered list; a Type slot has a fixed role.

- **Scene art** — an ordered gallery of Assets bound to a *story beat* (a whole
  reading Chapter or a timeline Event) rather than to a Subject. Despite the name
  it is **beat-scoped, not sub-scene-scoped**: it addresses the beat by its git
  **filename slug** (`beatRef`) — the same id the beat's URL uses — never a scene
  index within a chapter. The join is **unvalidated and one-way** (prose → media),
  like a Subject's: a `beatRef` matching no beat simply renders nothing, and no
  Asset is auto-deleted on a words-side rename. Its first image is the beat's hero
  **plate**; on reading it renders once, at the top of the chapter's first page,
  and also feeds that chapter's social (OG) image. The timeline fast-follow has
  now shipped: `/timeline` renders each beat's Scene art inline within its reveal
  gate (via one batched `getSceneMediaMap` read), so an Event beat
  shows its art on the thread too. A separate association from the entity-owned
  images above. See [ADR-0014](docs/adr/0014-scene-art-beat-scoped.md).
  _Avoid_: illustration, moment (ambiguous), scene index.

- **Plate** — the first, hero image of a beat's Scene art, shown large at the
  beat's doorway (a reading Chapter's first page). Extra Scene images live behind
  the plate in the Gallery lightbox. _Avoid_: cover (that's the book's), banner.

- **Credit.** Every Asset carries required **alt text** (accessibility) and an
  optional **artist credit** + source/licence note, so attribution travels with
  the image rather than living in someone's memory. Every credited Asset has at
  least one reachable public credit surface: detail/full image, gallery lightbox,
  or (for the standalone cover) the homepage hero. Cards omit credit because they
  link to their credited detail surface; licence terms can require a stricter
  placement. The credit renders publicly ("Art by —") when present, while the
  licence note remains private.

- **Credit URL.** An optional, valid web address for a credited artist or source.
  A nonblank Credit URL makes the public credit an outbound link; when absent,
  the artist name remains plain text.

- **Tier 1 recovery.** The sanctioned, fast recovery path for a recent,
  localized author error, using Sanity Studio undo and native document history.
  It restores a particular document without rolling back the media layer.

- **Tier 2 recovery.** The independent catastrophic-recovery path: a restorable
  native Sanity dataset export held outside Sanity. It protects against account
  or vendor loss, and against changes older than Tier 1 retains; it is not the
  first response to one recently damaged caption or Subject.

- **Recovery runbook.** The documented choice of recovery tier for a failure.
  Use Tier 1 for a recent, localized document error; use Tier 2 for loss of the
  Sanity account, vendor access, or data outside the Tier-1 retention window.

- **Source of truth.** The prose entry (git) is authoritative for whether a
  Subject *exists* and its slug/name; the media store is authoritative for its
  pictures. The two are reconciled one-way (prose → media): creating or renaming
  prose creates or renames the matching Subject. Deletion is never mirrored.

- **Orphaned Subject** — a Subject whose prose entry no longer exists. Its Assets
  are **never auto-deleted**; the Subject is flagged for manual review so uploaded
  art can never be destroyed by a words-side edit. _Avoid_: dangling, stale.
