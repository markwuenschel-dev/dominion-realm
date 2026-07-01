// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/activityRegen.ts
// §7  Activity-Based Regeneration
// Per-activity recovery rates (rest, meditation, travel, combat) derived from a
// character's final resource maxima and CON/END/WIS. Distinct from the §4
// safe-low curve in regeneration.ts — this is the model the character sheet shows.
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes } from '@/types';
import type { FinalResources, RegenRates } from '@/types/characterSheet';

/** Round to at most two decimals. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the §7 activity-based regen rates for one character.
 *
 * @param final Final resource maxima (after race/class/soul/condition mods).
 * @param attrs Attributes — only CON, END, WIS carry weight in this model.
 */
export function computeActivityRegenRates(final: FinalResources, attrs: Attributes): RegenRates {
  const { HP, Mana, Stamina, Reserve } = final;
  const { CON, END, WIS } = attrs;

  return {
    HP: {
      safeRest: round2(HP * 0.03 + CON / 2),
      lightRest: round2(HP * 0.015 + CON / 4),
      activeTravel: round2(HP * 0.005),
      combat: 0,
    },
    Mana: {
      meditation: round2(Mana * 0.05 + WIS / 5),
      calmNoncombat: round2(Mana * 0.02 + WIS / 10),
      activeTravel: round2(Mana * 0.01),
      combat: round2(Mana * 0.005),
    },
    Stamina: {
      fullRest: round2(Stamina * 0.12 + END / 2),
      catchingBreath: round2(Stamina * 0.08 + END / 3),
      lightMovement: round2(Stamina * 0.03),
      combat: round2(Stamina * 0.01),
    },
    Reserve: {
      deepSleep: round2(Reserve * 0.08 + WIS / 4),
      meditation: round2(Reserve * 0.05 + WIS / 5),
      ordinaryRest: round2(Reserve * 0.03),
      activeTravel: round2(Reserve * 0.01),
      combat: 0,
    },
  };
}
