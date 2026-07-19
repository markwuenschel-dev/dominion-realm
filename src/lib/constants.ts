// ─────────────────────────────────────────────────────────────────────────────
// lib/constants.ts  —  Locked formula coefficients and defaults
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes, RegenCurveParams, HealingPulseInput } from '@/types';

// ── Default attributes — calculator starting state (not the sheet baseline) ──
export const DEFAULT_ATTRIBUTES: Attributes = {
  CON: 10,
  END: 10,
  STR: 10,
  AGI: 10,
  DEX: 10,
  INT: 10,
  WIS: 10,
  CHA: 10,
  CVN: 10,
  MYS: 10,
};

// ── Resource maxima coefficients — formula lock §1.1 ──
export const HP_COEFFICIENTS = { CON: 6, END: 2, STR: 2 } as const satisfies Partial<
  Record<string, number>
>;
export const MANA_COEFFICIENTS = { INT: 6, WIS: 3, CHA: 1 } as const;
export const STAMINA_COEFFICIENTS = { END: 5, CON: 2, STR: 1, AGI: 1, DEX: 1 } as const;
export const RESERVE_COEFFICIENTS = { CON: 2, END: 2, WIS: 2, CVN: 1, MYS: 1 } as const;
export const MANA_RESERVE_RATIO = 5 as const;
export const STAMINA_RESERVE_RATIO = 5 as const;
/** The 20% mark: below it a resource enters overextension. The §6 Mana/Stamina
 *  Reserve-buffered floor and the calculator's failure-zone displays all key off
 *  this one number rather than a scattered `0.2` literal. */
export const OVEREXTENSION_THRESHOLD = 0.2;
export const MANA_FLOOR_FRACTION = OVEREXTENSION_THRESHOLD;
export const STAMINA_FLOOR_FRACTION = OVEREXTENSION_THRESHOLD;

// ── Regen coefficients — formula lock §3 ──
export const HP_REGEN_COEFFICIENTS = { CON: 0.5, END: 0.3, WIS: 0.2 };
export const MANA_REGEN_COEFFICIENTS = { INT: 0.25, WIS: 0.55, CHA: 0.2 };
export const STAMINA_REGEN_COEFFICIENTS = { END: 0.55, CON: 0.25, AGI: 0.1, WIS: 0.1 };
export const RESERVE_REGEN_COEFFICIENTS = {
  CON: 0.2,
  END: 0.2,
  WIS: 0.3,
  CVN: 0.15,
  MYS: 0.15,
};

// ── Activity-based regen coefficients — formula lock §7 ──
// Per-activity rates scale off the FINAL resource maxima; the rest/meditation
// tiers add a flat attribute term (max × fraction + attribute ÷ divisor). Kept
// here so the §7 model has one tuning surface like every other formula family.
export const ACTIVITY_REGEN_COEFFICIENTS = {
  HP: { safeRest: 0.03, lightRest: 0.015, activeTravel: 0.005 },
  Mana: { meditation: 0.05, calmNoncombat: 0.02, activeTravel: 0.01, combat: 0.005 },
  Stamina: { fullRest: 0.12, catchingBreath: 0.08, lightMovement: 0.03, combat: 0.01 },
  Reserve: { deepSleep: 0.08, meditation: 0.05, ordinaryRest: 0.03, activeTravel: 0.01 },
} as const;

/** Divisors for the flat attribute term added to the rest/meditation tiers. */
export const ACTIVITY_REGEN_ATTR_DIVISORS = {
  HP: { safeRest: 2, lightRest: 4 },
  Mana: { meditation: 5, calmNoncombat: 10 },
  Stamina: { fullRest: 2, catchingBreath: 3 },
  Reserve: { deepSleep: 4, meditation: 5 },
} as const;

// ── Safe-low curve defaults — formula lock §4 ──
export const DEFAULT_REGEN_CURVE_PARAMS: RegenCurveParams = {
  q_s: 0.1,
  gamma: 0.45,
  p: 2,
};

// ── Global modifier defaults ──
export const SOUL_LEVEL_MOD_DEFAULT = 1.0;
export const RECOVERY_STATE_MOD_DEFAULT = 1.0;

// ── Resistance coefficients — formula lock §11.1 ──
export const POISON_RESISTANCE_COEFFICIENTS = { CON: 1.0, WIS: 0.5 } as const;
export const STAGGER_RESISTANCE_COEFFICIENTS = { STR: 0.5, END: 0.3, AGI: 0.2 } as const;
export const MANA_CRASH_RESISTANCE_COEFFICIENTS = { WIS: 0.5, INT: 0.3, CON: 0.2 } as const;

// ── Attribute editor bounds ──
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 30;
export const ATTRIBUTE_STEP = 1;

// ── Condition (§9–11) ──
export const SEVERITY_BANDS = {
  none: 0,
  minor: 5,
  moderate: 15,
  severe: 30,
  catastrophic: 60,
};

// ── Example healing pulse: spear wound (§§12–20) ──
export const SPEAR_WOUND_PULSE: HealingPulseInput = {
  H0: 100,
  channels: [
    {
      id: 'physical-repair',
      label: 'Physical Repair',
      demand: 40,
      priority: 1.0,
      compatibility: 1.2,
      healingAccess: 12,
      barrier: 8,
      alpha: 1,
      K_W: 20,
      eta: 0.85,
    },
    {
      id: 'wound-field',
      label: 'Wound Field',
      demand: 25,
      priority: 0.6,
      compatibility: 0.9,
      healingAccess: 10,
      barrier: 12,
      alpha: 1,
      K_W: 15,
      eta: 0.7,
    },
    {
      id: 'condition-cleanse',
      label: 'Condition Cleanse',
      demand: 10,
      priority: 0.4,
      compatibility: 1.0,
      healingAccess: 8,
      barrier: 5,
      alpha: 1,
      K_W: 10,
      eta: 0.6,
    },
  ],
};
