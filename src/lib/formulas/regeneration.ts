// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/regeneration.ts
// §3  Base Regeneration Formulas
// §4  Safe-Low / Asymptotic Regeneration Curve
// §5  Resource-Specific Regeneration
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes, BaseRegen, RegenCurveParams, RegenResult, RegenZone } from '@/types';
import {
  HP_REGEN_COEFFICIENTS,
  MANA_REGEN_COEFFICIENTS,
  STAMINA_REGEN_COEFFICIENTS,
  RESERVE_REGEN_COEFFICIENTS,
  DEFAULT_REGEN_CURVE_PARAMS,
} from '@/lib/constants';

// ────────────────────────────────────────────────
// §3  Base Regen
// ────────────────────────────────────────────────

/**
 * BaseHPRegen = 0.50·CON + 0.30·END + 0.20·WIS
 */
export function computeBaseHPRegen(attrs: Attributes): number {
  return (
    HP_REGEN_COEFFICIENTS.CON * attrs.CON +
    HP_REGEN_COEFFICIENTS.END * attrs.END +
    HP_REGEN_COEFFICIENTS.WIS * attrs.WIS
  );
}

/**
 * BaseManaRegen = 0.25·INT + 0.55·WIS + 0.20·CHA
 */
export function computeBaseManaRegen(attrs: Attributes): number {
  return (
    MANA_REGEN_COEFFICIENTS.INT * attrs.INT +
    MANA_REGEN_COEFFICIENTS.WIS * attrs.WIS +
    MANA_REGEN_COEFFICIENTS.CHA * attrs.CHA
  );
}

/**
 * BaseStaminaRegen = 0.55·END + 0.25·CON + 0.10·AGI + 0.10·WIS
 */
export function computeBaseStaminaRegen(attrs: Attributes): number {
  return (
    STAMINA_REGEN_COEFFICIENTS.END * attrs.END +
    STAMINA_REGEN_COEFFICIENTS.CON * attrs.CON +
    STAMINA_REGEN_COEFFICIENTS.AGI * attrs.AGI +
    STAMINA_REGEN_COEFFICIENTS.WIS * attrs.WIS
  );
}

/**
 * BaseReserveRegen = 0.20·CON + 0.20·END + 0.30·WIS + 0.15·Faith + 0.15·Occult
 */
export function computeBaseReserveRegen(attrs: Attributes): number {
  return (
    RESERVE_REGEN_COEFFICIENTS.CON * attrs.CON +
    RESERVE_REGEN_COEFFICIENTS.END * attrs.END +
    RESERVE_REGEN_COEFFICIENTS.WIS * attrs.WIS +
    RESERVE_REGEN_COEFFICIENTS.Faith * attrs.Faith +
    RESERVE_REGEN_COEFFICIENTS.Occult * attrs.Occult
  );
}

/**
 * Compute all four base regen values at once.
 */
export function computeBaseRegen(attrs: Attributes): BaseRegen {
  return {
    HP: computeBaseHPRegen(attrs),
    Mana: computeBaseManaRegen(attrs),
    Stamina: computeBaseStaminaRegen(attrs),
    Reserve: computeBaseReserveRegen(attrs),
  };
}

// ────────────────────────────────────────────────
// §4  Safe-Low / Asymptotic Regen Curve
// ────────────────────────────────────────────────

/**
 * Determine the regen zone for a given q.
 */
export function getRegenZone(q: number, q_s: number): RegenZone {
  if (q <= 0) return 'zero';
  if (q < q_s) return 'failure';
  return 'safe';
}

/**
 * Compute the dimensionless regen multiplier given q = R(t)/R_max.
 *
 * Safe zone   (q ≥ q_s):  multiplier = ((1−q) / (1−q_s))^γ
 * Failure zone (0 < q < q_s): multiplier = (q / q_s)^p
 * Zero (q ≤ 0):           multiplier = 0
 *
 * Maximum multiplier of 1.0 occurs at q = q_s (the safe-low threshold).
 */
export function computeRegenMultiplier(
  q: number,
  params: RegenCurveParams = DEFAULT_REGEN_CURVE_PARAMS,
): number {
  const { q_s, gamma, p } = params;
  const zone = getRegenZone(q, q_s);

  switch (zone) {
    case 'zero':
      return 0;
    case 'failure':
      return Math.pow(q / q_s, p);
    case 'safe':
      return Math.pow((1 - q) / (1 - q_s), gamma);
    default:
      return 0;
  }
}

/**
 * Actual regen = BaseRegen × RecoveryStateMod × multiplier(q)
 *
 * Note: additional per-resource modifiers (NutritionMod, InjuryPenalty, etc.)
 * are intentionally excluded here — they are applied by the caller to keep
 * this function pure and testable.
 */
export function computeActualRegen(
  baseRegen: number,
  q: number,
  recoveryStateMod = 1.0,
  params: RegenCurveParams = DEFAULT_REGEN_CURVE_PARAMS,
): number {
  const multiplier = computeRegenMultiplier(q, params);
  return baseRegen * recoveryStateMod * multiplier;
}

// ────────────────────────────────────────────────
// §4.4  Curve sampling — for SVG visualization
// ────────────────────────────────────────────────

export interface CurveSample {
  q: number;
  multiplier: number;
  zone: RegenZone;
}

/**
 * Sample the regen curve at `steps` evenly-spaced q values.
 * Used to draw the SVG path in <RegenCurveViz />.
 */
export function sampleRegenCurve(
  params: RegenCurveParams = DEFAULT_REGEN_CURVE_PARAMS,
  steps = 200,
): CurveSample[] {
  const samples: CurveSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const q = i / steps;
    samples.push({
      q,
      multiplier: computeRegenMultiplier(q, params),
      zone: getRegenZone(q, params.q_s),
    });
  }
  return samples;
}

// ────────────────────────────────────────────────
// §5  Full regen result for a resource
// ────────────────────────────────────────────────

/**
 * Produce a full RegenResult for one resource.
 * Caller can apply additional modifiers to actualRegen as needed.
 */
export function computeRegenResult(
  resource: 'HP' | 'Mana' | 'Stamina' | 'Reserve',
  baseRegen: number,
  q: number,
  recoveryStateMod = 1.0,
  params: RegenCurveParams = DEFAULT_REGEN_CURVE_PARAMS,
): RegenResult {
  const zone = getRegenZone(q, params.q_s);
  const multiplier = computeRegenMultiplier(q, params);
  const actualRegen = zone === 'zero' ? 0 : baseRegen * recoveryStateMod * multiplier;

  return {
    resource,
    baseRegen,
    multiplier,
    actualRegen,
    zone,
  };
}

/**
 * Compute regen results for all four resources at once.
 */
export function computeAllRegenResults(
  attrs: Attributes,
  ratios: { HP: number; Mana: number; Stamina: number; Reserve: number },
  recoveryStateMod = 1.0,
  params: RegenCurveParams = DEFAULT_REGEN_CURVE_PARAMS,
): RegenResult[] {
  const base = computeBaseRegen(attrs);
  return [
    computeRegenResult('HP', base.HP, ratios.HP, recoveryStateMod, params),
    computeRegenResult('Mana', base.Mana, ratios.Mana, recoveryStateMod, params),
    computeRegenResult('Stamina', base.Stamina, ratios.Stamina, recoveryStateMod, params),
    computeRegenResult('Reserve', base.Reserve, ratios.Reserve, recoveryStateMod, params),
  ];
}
