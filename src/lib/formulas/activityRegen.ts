// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/activityRegen.ts
// §7  Activity-based regeneration.
// Distinct from the §4/5 safe-low regen curve in ./regeneration.ts: this model
// yields per-activity recovery rates (rest, meditation, travel, combat) from the
// FINAL resource maxima, not from the q-ratio curve.
// ─────────────────────────────────────────────────────────────────────────────

import type { FinalResources, RegenRates } from '@/types/characterSheet';

/** Round to 2 decimal places (matches the sheet's display precision). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Activity-based regen rates (§7). Rates scale off the character's FINAL resource
 * maxima; the rest/meditation tiers add a flat attribute term (CON/END/WIS).
 */
export function computeActivityRegenRates(
  final: FinalResources,
  attrs: { CON: number; END: number; WIS: number },
): RegenRates {
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
