// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/activityRegen.ts
// §7  Activity-based regeneration.
// Distinct from the §4/5 safe-low regen curve in ./regeneration.ts: this model
// yields per-activity recovery rates (rest, meditation, travel, combat) from the
// FINAL resource maxima, not from the q-ratio curve.
// ─────────────────────────────────────────────────────────────────────────────

import type { FinalResources, RegenRates } from '@/types/characterSheet';
import {
  ACTIVITY_REGEN_COEFFICIENTS as C,
  ACTIVITY_REGEN_ATTR_DIVISORS as D,
} from '@/lib/constants';

/** Round to 2 decimal places (matches the sheet's display precision). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Activity-based regen rates (§7). Rates scale off the character's FINAL resource
 * maxima; the rest/meditation tiers add a flat attribute term (CON/END/WIS). The
 * coefficients live once in `constants.ts` (ACTIVITY_REGEN_COEFFICIENTS / _DIVISORS).
 */
export function computeActivityRegenRates(
  final: FinalResources,
  attrs: { CON: number; END: number; WIS: number },
): RegenRates {
  const { HP, Mana, Stamina, Reserve } = final;
  const { CON, END, WIS } = attrs;
  return {
    HP: {
      safeRest: round2(HP * C.HP.safeRest + CON / D.HP.safeRest),
      lightRest: round2(HP * C.HP.lightRest + CON / D.HP.lightRest),
      activeTravel: round2(HP * C.HP.activeTravel),
      combat: 0,
    },
    Mana: {
      meditation: round2(Mana * C.Mana.meditation + WIS / D.Mana.meditation),
      calmNoncombat: round2(Mana * C.Mana.calmNoncombat + WIS / D.Mana.calmNoncombat),
      activeTravel: round2(Mana * C.Mana.activeTravel),
      combat: round2(Mana * C.Mana.combat),
    },
    Stamina: {
      fullRest: round2(Stamina * C.Stamina.fullRest + END / D.Stamina.fullRest),
      catchingBreath: round2(Stamina * C.Stamina.catchingBreath + END / D.Stamina.catchingBreath),
      lightMovement: round2(Stamina * C.Stamina.lightMovement),
      combat: round2(Stamina * C.Stamina.combat),
    },
    Reserve: {
      deepSleep: round2(Reserve * C.Reserve.deepSleep + WIS / D.Reserve.deepSleep),
      meditation: round2(Reserve * C.Reserve.meditation + WIS / D.Reserve.meditation),
      ordinaryRest: round2(Reserve * C.Reserve.ordinaryRest),
      activeTravel: round2(Reserve * C.Reserve.activeTravel),
      combat: 0,
    },
  };
}
