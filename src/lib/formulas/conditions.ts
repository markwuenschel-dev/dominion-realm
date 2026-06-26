// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/conditions.ts
// §9   Condition Calculus
// §10  Typed Penetration
// §11  Resistance and Threshold Width
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Attributes,
  ConditionInput,
  ConditionResult,
  SeverityBand,
  PenetrationInput,
  PenetrationResult,
} from '@/types';
import {
  POISON_RESISTANCE_COEFFICIENTS,
  STAGGER_RESISTANCE_COEFFICIENTS,
  MANA_CRASH_RESISTANCE_COEFFICIENTS,
} from '@/lib/constants';

// ────────────────────────────────────────────────
// §10  Typed Penetration
// ────────────────────────────────────────────────

/**
 * General typed penetration formula.
 *
 *   P_i = SourceAccess^α / (SourceAccess^α + Barrier^α)
 */
export function computePenetration(input: PenetrationInput): PenetrationResult {
  const { sourceAccess, barrier, alpha } = input;
  if (sourceAccess <= 0) return { penetration: 0, label: '0%' };

  const sa = Math.pow(sourceAccess, alpha);
  const ba = Math.pow(barrier, alpha);
  const penetration = sa / (sa + ba);

  return {
    penetration,
    label: `${(penetration * 100).toFixed(1)}%`,
  };
}

export function computeDamagePenetration(
  impactPower: number,
  defensePower: number,
  alpha = 1,
): number {
  return computePenetration({ sourceAccess: impactPower, barrier: defensePower, alpha })
    .penetration;
}

export function computePoisonPenetration(
  toxinAccess: number,
  toxinBarrier: number,
  alpha = 1,
): number {
  return computePenetration({ sourceAccess: toxinAccess, barrier: toxinBarrier, alpha })
    .penetration;
}

export function computeFearPenetration(
  threatPressure: number,
  mentalAnchoring: number,
  alpha = 1,
): number {
  return computePenetration({ sourceAccess: threatPressure, barrier: mentalAnchoring, alpha })
    .penetration;
}

export function computeCursePenetration(
  curseImprintPower: number,
  spiritualBoundary: number,
  alpha = 1,
): number {
  return computePenetration({ sourceAccess: curseImprintPower, barrier: spiritualBoundary, alpha })
    .penetration;
}

// ────────────────────────────────────────────────
// §11.1  Resistance Approximations
// ────────────────────────────────────────────────

/** PoisonResistance ≈ CON + 0.5·WIS */
export function computePoisonResistance(attrs: Attributes): number {
  return (
    POISON_RESISTANCE_COEFFICIENTS.CON * attrs.CON + POISON_RESISTANCE_COEFFICIENTS.WIS * attrs.WIS
  );
}

/** StaggerResistance ≈ 0.5·STR + 0.3·END + 0.2·AGI */
export function computeStaggerResistance(attrs: Attributes): number {
  return (
    STAGGER_RESISTANCE_COEFFICIENTS.STR * attrs.STR +
    STAGGER_RESISTANCE_COEFFICIENTS.END * attrs.END +
    STAGGER_RESISTANCE_COEFFICIENTS.AGI * attrs.AGI
  );
}

/** ManaCrashResistance ≈ 0.5·WIS + 0.3·INT + 0.2·CON */
export function computeManaCrashResistance(attrs: Attributes): number {
  return (
    MANA_CRASH_RESISTANCE_COEFFICIENTS.WIS * attrs.WIS +
    MANA_CRASH_RESISTANCE_COEFFICIENTS.INT * attrs.INT +
    MANA_CRASH_RESISTANCE_COEFFICIENTS.CON * attrs.CON
  );
}

// ────────────────────────────────────────────────
// §11.2  Threshold Width
// ────────────────────────────────────────────────

/**
 * ThresholdWidth_i = BaseWidth_i × Elasticity × Adaptation × Stability
 */
export function computeThresholdWidth(
  baseWidth: number,
  elasticity = 1.0,
  adaptation = 1.0,
  stability = 1.0,
): number {
  return baseWidth * elasticity * adaptation * stability;
}

// ────────────────────────────────────────────────
// §11  Condition Severity
// ────────────────────────────────────────────────

/**
 * Severity_i = (C_i − Resistance_i) / ThresholdWidth_i
 *
 * Bands: < 0 → none · 0–<1 → minor · 1–<2 → moderate · 2–<3 → severe · ≥ 3 → catastrophic
 */
export function computeSeverity(input: ConditionInput): ConditionResult {
  const { load, resistance, thresholdWidth } = input;

  if (thresholdWidth <= 0) {
    return { severity: 0, band: 'none', description: 'Invalid threshold width' };
  }

  const severity = (load - resistance) / thresholdWidth;
  const band = getSeverityBand(severity);

  return {
    severity,
    band,
    description: SEVERITY_DESCRIPTIONS[band],
  };
}

function getSeverityBand(severity: number): SeverityBand {
  if (severity < 0) return 'none';
  if (severity < 1) return 'minor';
  if (severity < 2) return 'moderate';
  if (severity < 3) return 'severe';
  return 'catastrophic';
}

const SEVERITY_DESCRIPTIONS: Record<SeverityBand, string> = {
  none: 'Resisted — no meaningful effect',
  minor: 'Noticeable but manageable',
  moderate: 'Tactically relevant impairment',
  severe: 'Major impairment',
  catastrophic: 'Collapse / crisis / disabling state',
};

// ────────────────────────────────────────────────
// §9.1  Condition Load Dynamics (discrete approximation)
// ────────────────────────────────────────────────

/** Discrete step: ΔC = (application − clearance) × dt */
export function stepConditionLoad(
  currentLoad: number,
  applicationRate: number,
  clearanceRate: number,
  dt = 1.0,
): number {
  const delta = (applicationRate - clearanceRate) * dt;
  return Math.max(0, currentLoad + delta);
}

/** Condition application rate: A_i = I_i × E_i × P_i × S_i */
export function computeApplicationRate(
  intensity: number,
  exposure: number,
  penetration: number,
  susceptibility = 1.0,
): number {
  return intensity * exposure * penetration * susceptibility;
}
