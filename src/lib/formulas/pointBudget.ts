// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/pointBudget.ts
// Character-sheet point-buy budget. Attributes start at the all-5s baseline
// (resource_system.md §18/§19); points "spent" is each attribute's deviation
// above that floor, summed over the attribute values passed in. On the sheet
// LUCK's value IS included — it is a raisable attribute with ± controls drawing
// from the same visible pool; the resource-formula firewall governs formulas,
// not the point economy.
// ─────────────────────────────────────────────────────────────────────────────

/** All-5s point-buy baseline. Each attribute starts here. */
export const ATTRIBUTE_BASELINE = 5;

/**
 * Points allocated above baseline, summed over the given attribute values.
 * The caller decides which attributes are in the list (LUCK included on the
 * sheet). Can be negative: attributes are editable below the baseline (floor 1).
 */
export function computeSpentPoints(
  attributeValues: readonly number[],
  base: number = ATTRIBUTE_BASELINE,
): number {
  return attributeValues.reduce((sum, value) => sum + (value - base), 0);
}

export interface PointBudget {
  /** Free-point pool from level. */
  total: number;
  spent: number;
  /** total − spent; negative when over budget (not clamped). */
  remaining: number;
}

/** Level-driven point pool vs. points already allocated above baseline. */
export function computePointBudget(args: {
  level: number;
  pointsPerLevel: number;
  attributeValues: readonly number[];
  base?: number;
}): PointBudget {
  const total = args.level * args.pointsPerLevel;
  const spent = computeSpentPoints(args.attributeValues, args.base ?? ATTRIBUTE_BASELINE);
  return { total, spent, remaining: total - spent };
}
