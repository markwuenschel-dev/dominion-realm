// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCharacterSheet.ts
// All derived character sheet values — reads store, runs computations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { computeResourceChain } from '@/lib/formulas/resourceChain';
import { computeActivityRegenRates } from '@/lib/formulas/activityRegen';
import { SPECIES_TEMPLATES } from '@/lib/characterTemplates';
import { getClassProfile } from '@/lib/classTaxonomy';
import { getSoulMultiplier } from '@/lib/formulas/progression';
import { xpToNextLevel as computeXpToNextLevel } from '@/lib/xpFormulas';
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
  const { finalResources, breakdowns } = useMemo(
    () =>
      computeResourceChain({
        attributes,
        profile: classProfile,
        raceMod: speciesTemplate.raceMod,
        conditionMods,
        soulMult,
      }),
    [attributes, classProfile, speciesTemplate, conditionMods, soulMult],
  );

  const totalFreePoints = useMemo(
    () => level * speciesTemplate.pointsPerLevel,
    [level, speciesTemplate.pointsPerLevel],
  );

  const spentPoints = useMemo(() => {
    const BASE_EACH = 5;
    const keys = Object.keys(attributes) as (keyof typeof attributes)[];
    return keys.reduce((sum, k) => sum + (attributes[k] - BASE_EACH), 0);
  }, [attributes]);

  // Class rarity no longer grants recurring bonus attribute points (canon firewall).
  const totalPointsAvailable = totalFreePoints;
  const remainingPoints = totalPointsAvailable - spentPoints;

  // Prevalence-derived XP model. Unique-tier returns null (N_cycle undefined) —
  // never coerce to 0/NaN; carry the null through to the UI.
  const xpToNextLevel = useMemo(
    () => computeXpToNextLevel(level, classProfile.rarity),
    [level, classProfile.rarity],
  );

  const xpProgressPercent = useMemo((): number | null => {
    if (xpToNextLevel === null) return null;
    if (xpToNextLevel <= 0) return 0;
    return Math.min(100, Math.round((currentXP / xpToNextLevel) * 100));
  }, [currentXP, xpToNextLevel]);

  // §7 activity-based regen — delegated to the tested formulas seam.
  const regenRates = useMemo(
    () =>
      computeActivityRegenRates(finalResources, {
        CON: attributes.CON,
        END: attributes.END,
        WIS: attributes.WIS,
      }),
    [finalResources, attributes.CON, attributes.END, attributes.WIS],
  );

  return {
    breakdowns,
    finalResources,
    totalFreePoints,
    totalPointsAvailable,
    spentPoints,
    remainingPoints,
    xpToNextLevel,
    xpProgressPercent,
    regenRates,
  };
}
