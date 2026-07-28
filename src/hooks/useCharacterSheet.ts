// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCharacterSheet.ts
// All derived character sheet values — reads store, runs computations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { computeSheetResources } from '@/lib/formulas/resourceChain';
import { computeActivityRegenRates } from '@/lib/formulas/activityRegen';
import { SPECIES_TEMPLATES } from '@/lib/characterTemplates';
import { getClassProfile } from '@/lib/classTaxonomy';
import { getSoulMultiplier } from '@/lib/formulas/progression';
import { computePointBudget } from '@/lib/formulas/pointBudget';
import { xpToNextLevel as computeXpToNextLevel, xpProgress } from '@/lib/xpFormulas';
import type { CharacterSheetDerived } from '@/types/characterSheet';

// ────────────────────────────────────────────────
// Main hook
// ────────────────────────────────────────────────

export function useCharacterSheet(): CharacterSheetDerived {
  const { level, species, className, soulLevel, attributes, conditionMods, currentXP } =
    useCharacterSheetStore();

  const speciesTemplate = SPECIES_TEMPLATES[species];
  const classProfile = getClassProfile(className);
  const soulMult = getSoulMultiplier(soulLevel);

  // §1 + §5 resource chain. Class influence enters once, at the attribute layer,
  // via the effective-attribute seam — the same rounded values the sheet's
  // attribute cells display — so display and formula can never disagree. The seam
  // owns the round-once rule and the LUCK firewall; Reserve alone × soul multiplier.
  const { finalResources, breakdowns, attributeViews, effectiveAttributes } = useMemo(
    () =>
      computeSheetResources({
        attributes,
        profile: classProfile,
        raceMod: speciesTemplate.raceMod,
        conditionMods,
        soulMult,
      }),
    [attributes, classProfile, speciesTemplate, conditionMods, soulMult],
  );

  // Point budget — LUCK IS counted (the full attributes map is passed, so raising
  // LUCK spends from the pool). Class rarity grants no recurring bonus points
  // (canon firewall), so available === free.
  const {
    total: totalFreePoints,
    spent: spentPoints,
    remaining: remainingPoints,
  } = useMemo(
    () =>
      computePointBudget({
        level,
        pointsPerLevel: speciesTemplate.pointsPerLevel,
        // every sheet attribute's value, LUCK included.
        attributeValues: Object.values(attributes),
      }),
    [level, speciesTemplate.pointsPerLevel, attributes],
  );
  const totalPointsAvailable = totalFreePoints;

  // Prevalence-derived XP model. Unique-tier returns null (N_cycle undefined) —
  // never coerce to 0/NaN; carry the null through to the UI.
  const xpToNextLevel = useMemo(
    () => computeXpToNextLevel(level, classProfile.rarity),
    [level, classProfile.rarity],
  );

  const xpProgressPercent = useMemo(
    () => xpProgress(currentXP, xpToNextLevel),
    [currentXP, xpToNextLevel],
  );

  // §7 activity-based regen — delegated to the tested formulas seam. The flat
  // attribute term reads EFFECTIVE attributes, not raw store values: the maxima it
  // scales off are already class-scaled, and these are the same rounded numbers the
  // attribute cells display. Passing raw here made a Warrior sheet show END 12 and
  // regen from 10 — display and formula disagreeing at the last unconverted seam.
  const regenRates = useMemo(
    () =>
      computeActivityRegenRates(finalResources, {
        CON: effectiveAttributes.CON,
        END: effectiveAttributes.END,
        WIS: effectiveAttributes.WIS,
      }),
    [finalResources, effectiveAttributes.CON, effectiveAttributes.END, effectiveAttributes.WIS],
  );

  return {
    breakdowns,
    finalResources,
    attributeViews,
    totalFreePoints,
    totalPointsAvailable,
    spentPoints,
    remainingPoints,
    xpToNextLevel,
    xpProgressPercent,
    regenRates,
  };
}
