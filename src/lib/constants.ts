// ─────────────────────────────────────────────────────────────────────────────
// lib/constants.ts  —  All locked formula coefficients and defaults
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes, RegenCurveParams, HealingPulseInput } from '@/types'

// ── Default attributes (level-1 baseline, all equal) ──
export const DEFAULT_ATTRIBUTES: Attributes = {
  CON: 10, END: 10, STR: 10, AGI: 10, DEX: 10,
  INT: 10, WIS: 10, CHA: 10,
  Faith: 10, Occult: 10,
}

// ── Resource maxima coefficients (§1.1) ──
export const HP_MAX_COEFFICIENTS     = { CON: 2.0, STR: 1.0, END: 0.5 }
export const MANA_MAX_COEFFICIENTS   = { INT: 2.0, WIS: 1.5, CHA: 0.5 }
export const STAMINA_MAX_COEFFICIENTS = { END: 1.5, STR: 1.0, AGI: 0.5, DEX: 0.5 }
export const RESERVE_MAX_COEFFICIENTS = { Faith: 1.5, Occult: 1.5, WIS: 0.5 }
export const RESOURCE_SCALE = 10

// ── Regen coefficients (§3) ──
export const HP_REGEN_COEFFICIENTS      = { CON: 0.50, END: 0.30, WIS: 0.20 }
export const MANA_REGEN_COEFFICIENTS    = { INT: 0.25, WIS: 0.55, CHA: 0.20 }
export const STAMINA_REGEN_COEFFICIENTS = { END: 0.55, CON: 0.25, AGI: 0.10, WIS: 0.10 }
export const RESERVE_REGEN_COEFFICIENTS = { CON: 0.20, END: 0.20, WIS: 0.30, Faith: 0.15, Occult: 0.15 }
export const REGEN_SCALE = 0.5

// ── Safe-low curve defaults (§4) ──
export const DEFAULT_REGEN_CURVE_PARAMS: RegenCurveParams = {
  q_s:   0.10,
  gamma: 0.45,
  p:     2,
}

// ── Global modifier defaults ──
export const SOUL_LEVEL_MOD_DEFAULT      = 1.0
export const RECOVERY_STATE_MOD_DEFAULT  = 1.0

// ── Condition (§9–11) ──
export const SEVERITY_BANDS = {
  none:         0,
  minor:        5,
  moderate:     15,
  severe:       30,
  catastrophic: 60,
}

// ── Example healing pulse: spear wound (§§12–20) ──
export const SPEAR_WOUND_PULSE: HealingPulseInput = {
  H0: 100,
  channels: [
    {
      id: 'physical-repair',
      label: 'Physical Repair',
      demand:         40,
      priority:       1.0,
      compatibility:  1.2,
      healingAccess:  12,
      barrier:        8,
      alpha:          1,
      K_W:            20,
      eta:            0.85,
    },
    {
      id: 'wound-field',
      label: 'Wound Field',
      demand:         25,
      priority:       0.6,
      compatibility:  0.9,
      healingAccess:  10,
      barrier:        12,
      alpha:          1,
      K_W:            15,
      eta:            0.70,
    },
    {
      id: 'condition-cleanse',
      label: 'Condition Cleanse',
      demand:         10,
      priority:       0.4,
      compatibility:  1.0,
      healingAccess:  8,
      barrier:        5,
      alpha:          1,
      K_W:            10,
      eta:            0.60,
    },
  ],
}
