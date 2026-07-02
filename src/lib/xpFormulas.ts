// ─────────────────────────────────────────────────────────────────────────────
// lib/xpFormulas.ts
// Prevalence-derived exponential XP model. Reference implementation transcribed
// from xp_progression_formulas.md §§19–20.
//
// Do NOT hand-edit D0 or BETA. If pacing changes, change the design anchors
// (XP_Common(1)=100, XP_Common(20)≈5216, XP_Legendary(20)≈1.38·XP_Common(20))
// and re-solve — never tweak these constants directly.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClassRarity } from '@/lib/classTaxonomy';

const LEVEL_ONE_XP = 100.0;

const D0 = 2.5177067041177548;
const BETA = 0.075692057056489;

// Prevalence relative to Common. Unique is deliberately absent — N_cycle is
// undefined, so it must not get a numeric entry (see xpToNextLevel guard).
const PREVALENCE: Record<Exclude<ClassRarity, 'Unclassed' | 'Unique'>, number> = {
  Common: 1,
  Uncommon: 1 / 10,
  Rare: 1 / 100,
  Epic: 1 / 1000,
  Fabled: 1 / 100000,
  Legendary: 1 / 1000000,
  Mythic: 1 / 100000000,
};

const INFORMATION: Record<keyof typeof PREVALENCE, number> = Object.fromEntries(
  Object.entries(PREVALENCE).map(([rarity, p]) => [rarity, Math.log(PREVALENCE.Common / p)]),
) as Record<keyof typeof PREVALENCE, number>;

function V0(level: number): number {
  return Math.pow(level, D0);
}

function eta(level: number, info: number): number {
  if (info === 0) return 0;
  const accumulated = Math.log(V0(level) / V0(1));
  return 1 - Math.exp(-accumulated / (1 + info));
}

function VClass(level: number, info: number): number {
  return V0(level) * Math.exp(BETA * info * eta(level, info));
}

/**
 * XP required to advance from `level` to `level + 1` for the given rarity.
 * Returns null for 'Unique' — N_cycle is undefined; do not fabricate a number.
 * 'Unclassed' is treated as Common for pacing purposes.
 */
export function xpToNextLevel(level: number, rarity: ClassRarity): number | null {
  if (rarity === 'Unique') return null; // N_cycle undefined
  const effectiveRarity = rarity === 'Unclassed' ? 'Common' : rarity;
  const info = INFORMATION[effectiveRarity as keyof typeof PREVALENCE];
  const numerator = VClass(level + 1, info) - VClass(level, info);
  const denominator = VClass(2, info) - VClass(1, info);
  return LEVEL_ONE_XP * (numerator / denominator);
}

// ────────────────────────────────────────────────
// Scene XP (§§6/20) — optional saturation mini-tool. Not yet wired into any UI.
// ────────────────────────────────────────────────

/** SceneXP = thresholdXp · (1 − e^(−adaptiveEvidence)). */
export function sceneXP(thresholdXp: number, adaptiveEvidence: number): number {
  return thresholdXp * (1 - Math.exp(-adaptiveEvidence));
}

export const SCENE_CALIBRATION_BANDS = {
  'Low-risk productive practice': 0.04,
  'Controlled spar / drill under pressure': 0.1,
  'Serious class-relevant challenge': 0.25,
  'Dangerous novel combat': 0.45,
  'Near-death adaptive breakthrough': 0.75,
  'Arc-defining threshold event': 1.25,
} as const;
