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

- **Resource chain.** `computeResourceChain(input)` in `formulas/resourceChain.ts`
  runs the whole §1 → final pipeline: effective attributes → §1 maxima → base
  maxima × race mod × condition mod (Reserve additionally × soul multiplier),
  rounded. `useCharacterSheet` calls it once; class influence enters only through
  the effective-attribute seam, never as a resource-level multiplier.

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
  INT, WIS, CHA, Faith, Occult). Type `Attributes` in `src/types`.
- **CharacterSheetAttributes** — `Attributes` plus **LUCK**, which is tracked on
  the sheet but has no resource-formula effect in the current lock.
