// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCharacterSheet.ts
// All derived character sheet values — reads store, runs computations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { computeResourceMaxima } from '@/lib/formulas/resources';
import { computeActivityRegenRates } from '@/lib/formulas/activityRegen';
import {
  SPECIES_TEMPLATES,
  CLASS_TEMPLATES,
  getSoulMultiplier,
  computeBaseXP,
  computeClassBonusPoints,
  CLASS_RARITY_XP_MULTIPLIERS,
} from '@/lib/characterTemplates';
import type {
  CharacterSheetDerived,
  ResourceBreakdown,
  FinalResources,
} from '@/types/characterSheet';

// ────────────────────────────────────────────────
// Main hook
// ────────────────────────────────────────────────

export function useCharacterSheet(): CharacterSheetDerived {
  const {
    level,
    species,
    className,
    classAcquisitionLevel,
    soulLevel,
    attributes,
    conditionMods,
    currentXP,
  } = useCharacterSheetStore();

  const speciesTemplate = SPECIES_TEMPLATES[species];
  const classTemplate = CLASS_TEMPLATES[className];
  const soulMult = getSoulMultiplier(soulLevel);

  // §1 attribute-resource maxima — same tested seam the calculator uses.
  // LUCK carries no formula weight, so CharacterSheetAttributes flows straight in.
  // soulLevelMod stays 1.0 here; the soul multiplier is applied to Reserve in
  // finalResources below, alongside race/class/condition mods.
  const attributeResources = useMemo(() => computeResourceMaxima(attributes, 1.0), [attributes]);

  // Final resources: AttributeResource × RaceMod × ClassMod × ConditionMod
  // Reserve additionally × SoulMultiplier
  const finalResources = useMemo((): FinalResources => {
    const { HP, Mana, Stamina, Reserve } = attributeResources;
    const rm = speciesTemplate.raceMod;
    const cm = classTemplate.classMod;
    const cd = conditionMods;
    return {
      HP: Math.round(HP * rm.HP * cm.HP * cd.HP),
      Mana: Math.round(Mana * rm.Mana * cm.Mana * cd.Mana),
      Stamina: Math.round(Stamina * rm.Stamina * cm.Stamina * cd.Stamina),
      Reserve: Math.round(Reserve * soulMult * rm.Reserve * cm.Reserve * cd.Reserve),
    };
  }, [attributeResources, speciesTemplate, classTemplate, conditionMods, soulMult]);

  const breakdowns = useMemo((): ResourceBreakdown[] => {
    const rm = speciesTemplate.raceMod;
    const cm = classTemplate.classMod;
    const cd = conditionMods;
    return (['HP', 'Mana', 'Stamina', 'Reserve'] as const).map((r) => ({
      resource: r,
      attributeValue: attributeResources[r],
      raceMod: rm[r],
      classMod: cm[r],
      soulMultiplier: r === 'Reserve' ? soulMult : 1,
      conditionMod: cd[r],
      final: finalResources[r],
    }));
  }, [attributeResources, speciesTemplate, classTemplate, conditionMods, soulMult, finalResources]);

  const totalFreePoints = useMemo(
    () => level * speciesTemplate.pointsPerLevel,
    [level, speciesTemplate.pointsPerLevel],
  );

  const classBonusPoints = useMemo(
    () => computeClassBonusPoints(level, classAcquisitionLevel, classTemplate.bonusPointCadence),
    [level, classAcquisitionLevel, classTemplate.bonusPointCadence],
  );

  const spentPoints = useMemo(() => {
    const BASE_EACH = 5;
    const keys = Object.keys(attributes) as (keyof typeof attributes)[];
    return keys.reduce((sum, k) => sum + (attributes[k] - BASE_EACH), 0);
  }, [attributes]);

  const totalPointsAvailable = totalFreePoints + classBonusPoints;
  const remainingPoints = totalPointsAvailable - spentPoints;

  const xpToNextLevel = useMemo(() => {
    const base = computeBaseXP(level);
    const mult = CLASS_RARITY_XP_MULTIPLIERS[classTemplate.rarity];
    return Math.round(base * mult);
  }, [level, classTemplate.rarity]);

  const xpProgressPercent = useMemo(
    () => (xpToNextLevel > 0 ? Math.min(100, Math.round((currentXP / xpToNextLevel) * 100)) : 0),
    [currentXP, xpToNextLevel],
  );

  const regenRates = useMemo(
    () => computeActivityRegenRates(finalResources, attributes),
    [finalResources, attributes],
  );

  return {
    breakdowns,
    finalResources,
    totalFreePoints,
    classBonusPoints,
    totalPointsAvailable,
    spentPoints,
    remainingPoints,
    xpToNextLevel,
    xpProgressPercent,
    regenRates,
  };
}
