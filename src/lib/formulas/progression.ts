// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/progression.ts
// Pure progression maths lifted out of characterTemplates.ts:
//   §15  XP curve            (computeBaseXP)
//   §14  class bonus points  (computeClassBonusPoints)
//   §6   soul multiplier     (getSoulMultiplier)
// Canon data (SOUL_LEVELS, class/species tables) stays in characterTemplates.ts;
// this module reads the soul ladder the way resources.ts reads lib/constants.
// ─────────────────────────────────────────────────────────────────────────────

import { SOUL_LEVELS, type SoulLevelKey } from '@/lib/characterTemplates';

/** §15  BaseXP(L) = 75L + 25L·log₂(L+1) + 4L·(L−1). Levels below 1 yield 0. */
export function computeBaseXP(level: number): number {
  if (level < 1) return 0;
  return Math.round(75 * level + 25 * level * Math.log2(level + 1) + 4 * level * (level - 1));
}

/** §14  ClassBonusPoints = ⌊max(0, CharLevel − AcqLevel) / ClassCadence⌋. Cadence ≤ 0 yields 0. */
export function computeClassBonusPoints(
  characterLevel: number,
  classAcquisitionLevel: number,
  bonusPointCadence: number,
): number {
  if (bonusPointCadence <= 0) return 0;
  const effective = Math.max(0, characterLevel - classAcquisitionLevel);
  return Math.floor(effective / bonusPointCadence);
}

/** §6  Soul-level multiplier for Reserve. Unknown keys fall back to 1.0. */
export function getSoulMultiplier(key: SoulLevelKey): number {
  return SOUL_LEVELS.find((s) => s.key === key)?.multiplier ?? 1.0;
}
