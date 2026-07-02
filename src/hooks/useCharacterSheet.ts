// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCharacterSheet.ts
// All derived character sheet values — reads store, runs computations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { computeResourceMaxima } from '@/lib/formulas/resources';
import { computeActivityRegenRates } from '@/lib/formulas/activityRegen';
import { SPECIES_TEMPLATES } from '@/lib/characterTemplates';
import { getClassProfile, getClassAttrMultiplier } from '@/lib/classTaxonomy';
import { getSoulMultiplier } from '@/lib/formulas/progression';
import { xpToNextLevel as computeXpToNextLevel } from '@/lib/xpFormulas';
import { ATTRIBUTE_KEYS } from '@/types';
import type { Attributes } from '@/types';
import type {
  CharacterSheetDerived,
  ResourceBreakdown,
  FinalResources,
} from '@/types/characterSheet';

// ────────────────────────────────────────────────
// Main hook
// ────────────────────────────────────────────────

export function useCharacterSheet(): CharacterSheetDerived {
  const { level, species, className, soulLevel, attributes, conditionMods, currentXP } =
    useCharacterSheetStore();

  const speciesTemplate = SPECIES_TEMPLATES[species];
  const classProfile = getClassProfile(className);
  const soulMult = getSoulMultiplier(soulLevel);

  // §5 Class influence enters at the attribute layer: each formula-relevant
  // attribute is scaled by its Prime/Core/Secondary/Neutral class multiplier
  // before the resource formulas run. Unclassed → every multiplier is 1.0.
  // (LUCK is intentionally excluded — it is not a resource-formula input.)
  const effectiveAttributes = useMemo<Attributes>(() => {
    const result = {} as Attributes;
    for (const key of ATTRIBUTE_KEYS) {
      result[key] = attributes[key] * getClassAttrMultiplier(classProfile, key);
    }
    return result;
  }, [attributes, classProfile]);

  // §1 attribute-resource maxima from the effective (class-scaled) attributes.
  // soulLevelMod stays 1.0 here; the soul multiplier is applied to Reserve in
  // finalResources below, alongside race/condition mods.
  const attributeResources = useMemo(
    () => computeResourceMaxima(effectiveAttributes, 1.0),
    [effectiveAttributes],
  );

  // Final resources: AttributeResource × RaceMod × ConditionMod.
  // Reserve additionally × SoulMultiplier. Class effect is already baked into
  // attributeResources via effectiveAttributes — there is no resource-level
  // class multiplier anymore.
  const finalResources = useMemo((): FinalResources => {
    const { HP, Mana, Stamina, Reserve } = attributeResources;
    const rm = speciesTemplate.raceMod;
    const cd = conditionMods;
    return {
      HP: Math.round(HP * rm.HP * cd.HP),
      Mana: Math.round(Mana * rm.Mana * cd.Mana),
      Stamina: Math.round(Stamina * rm.Stamina * cd.Stamina),
      Reserve: Math.round(Reserve * soulMult * rm.Reserve * cd.Reserve),
    };
  }, [attributeResources, speciesTemplate, conditionMods, soulMult]);

  const breakdowns = useMemo((): ResourceBreakdown[] => {
    const rm = speciesTemplate.raceMod;
    const cd = conditionMods;
    return (['HP', 'Mana', 'Stamina', 'Reserve'] as const).map((r) => ({
      resource: r,
      attributeValue: Math.round(attributeResources[r]),
      raceMod: rm[r],
      soulMultiplier: r === 'Reserve' ? soulMult : 1,
      conditionMod: cd[r],
      final: finalResources[r],
    }));
  }, [attributeResources, speciesTemplate, conditionMods, soulMult, finalResources]);

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
