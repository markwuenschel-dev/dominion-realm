// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/progression.ts
// Pure progression maths:
//   §6   soul multiplier     (getSoulMultiplier)
// The XP model now lives in lib/xpFormulas.ts (prevalence-derived); the old
// polynomial computeBaseXP and class-bonus-point cadence were removed per canon.
// Canon data (SOUL_LEVELS) stays in characterTemplates.ts; this module reads the
// soul ladder the way resources.ts reads lib/constants.
// ─────────────────────────────────────────────────────────────────────────────

import { SOUL_LEVELS, type SoulLevelKey } from '@/lib/characterTemplates';

/** §6  Soul-level multiplier for Reserve. Unknown keys fall back to 1.0. */
export function getSoulMultiplier(key: SoulLevelKey): number {
  return SOUL_LEVELS.find((s) => s.key === key)?.multiplier ?? 1.0;
}
