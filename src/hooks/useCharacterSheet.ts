// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCharacterSheet.ts
// All derived character sheet values — reads store, runs computations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import {
  SPECIES_TEMPLATES,
  CLASS_TEMPLATES,
  CLASS_RARITY_XP_MULTIPLIERS,
} from '@/lib/characterTemplates';
import {
  getSoulMultiplier,
  computeBaseXP,
  computeClassBonusPoints,
} from '@/lib/formulas/progression';
import type {
  CharacterSheetDerived,
  ResourceBreakdown,
  RegenRates,
  FinalResources,
} from '@/types/characterSheet';

// ────────────────────────────────────────────────
// Regen rates  resource_system.md §7
// Activity-based model — separate from the safe-low curve used in the calculator
// ────────────────────────────────────────────────

function computeRegenRates(
  finalHP: number,
  finalMana: number,
  finalStamina: number,
  finalReserve: number,
  CON: number,
  END: number,
  WIS: number,
): RegenRates {
  return {
    HP: {
      safeRest: Math.round((finalHP * 0.03 + CON / 2) * 100) / 100,
      lightRest: Math.round((finalHP * 0.015 + CON / 4) * 100) / 100,
      activeTravel: Math.round(finalHP * 0.005 * 100) / 100,
      combat: 0,
    },
    Mana: {
      meditation: Math.round((finalMana * 0.05 + WIS / 5) * 100) / 100,
      calmNoncombat: Math.round((finalMana * 0.02 + WIS / 10) * 100) / 100,
      activeTravel: Math.round(finalMana * 0.01 * 100) / 100,
      combat: Math.round(finalMana * 0.005 * 100) / 100,
    },
    Stamina: {
      fullRest: Math.round((finalStamina * 0.12 + END / 2) * 100) / 100,
      catchingBreath: Math.round((finalStamina * 0.08 + END / 3) * 100) / 100,
      lightMovement: Math.round(finalStamina * 0.03 * 100) / 100,
      combat: Math.round(finalStamina * 0.01 * 100) / 100,
    },
    Reserve: {
      deepSleep: Math.round((finalReserve * 0.08 + WIS / 4) * 100) / 100,
      meditation: Math.round((finalReserve * 0.05 + WIS / 5) * 100) / 100,
      ordinaryRest: Math.round(finalReserve * 0.03 * 100) / 100,
      activeTravel: Math.round(finalReserve * 0.01 * 100) / 100,
      combat: 0,
    },
  };
}

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

  // Attribute resource values (first-file formulas, no LUCK)
  const attributeResources = useMemo(() => {
    const a = attributes;
    return {
      HP: 6 * a.CON + 2 * a.END + 2 * a.STR,
      Mana: 6 * a.INT + 3 * a.WIS + a.CHA,
      Stamina: 5 * a.END + 2 * a.CON + a.STR + a.AGI + a.DEX,
      Reserve: 2 * a.CON + 2 * a.END + 2 * a.WIS + a.Faith + a.Occult,
    };
  }, [attributes]);

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
    () =>
      computeRegenRates(
        finalResources.HP,
        finalResources.Mana,
        finalResources.Stamina,
        finalResources.Reserve,
        attributes.CON,
        attributes.END,
        attributes.WIS,
      ),
    [finalResources, attributes.CON, attributes.END, attributes.WIS],
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
