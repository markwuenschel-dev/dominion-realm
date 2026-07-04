// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/pointBudget.test.ts
// The character-sheet point-buy budget: points spent = deviation of each
// attribute above the all-5s baseline, summed across every sheet attribute
// (LUCK included — it is a raisable attribute drawing from the same pool).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { ATTRIBUTE_BASELINE, computeSpentPoints, computePointBudget } from './pointBudget';

const baseline = () => ({
  CON: 5,
  END: 5,
  STR: 5,
  AGI: 5,
  DEX: 5,
  INT: 5,
  WIS: 5,
  CHA: 5,
  CVN: 5,
  MYS: 5,
  LUCK: 5,
});

const values = (o: Record<string, number>) => Object.values(o);

describe('ATTRIBUTE_BASELINE', () => {
  it('is the all-5s point-buy floor', () => {
    expect(ATTRIBUTE_BASELINE).toBe(5);
  });
});

describe('computeSpentPoints — deviation above baseline', () => {
  it('is 0 when every attribute is at baseline', () => {
    expect(computeSpentPoints(values(baseline()))).toBe(0);
  });

  it('counts a single raised attribute', () => {
    expect(computeSpentPoints(values({ ...baseline(), STR: 8 }))).toBe(3);
  });

  it('counts LUCK toward the budget (it is a spendable attribute)', () => {
    expect(computeSpentPoints(values({ ...baseline(), LUCK: 10 }))).toBe(5);
  });

  it('goes negative for an attribute dropped below baseline', () => {
    // The editor clamp floor is 1, so LUCK:1 is reachable → -4.
    expect(computeSpentPoints(values({ ...baseline(), LUCK: 1 }))).toBe(-4);
  });

  it('honors a custom base', () => {
    // base 10: ten attrs at 5 → −5 each = −50; STR at 10 → 0. Total −50.
    expect(computeSpentPoints(values({ ...baseline(), STR: 10 }), 10)).toBe(-50);
  });
});

describe('computePointBudget — level pool vs allocation', () => {
  it('total = level × pointsPerLevel; remaining = total − spent', () => {
    expect(
      computePointBudget({
        level: 10,
        pointsPerLevel: 4,
        attributeValues: values({ ...baseline(), STR: 9 }),
      }),
    ).toEqual({ total: 40, spent: 4, remaining: 36 });
  });

  it('all-baseline level 1 spends nothing', () => {
    expect(
      computePointBudget({ level: 1, pointsPerLevel: 4, attributeValues: values(baseline()) }),
    ).toEqual({
      total: 4,
      spent: 0,
      remaining: 4,
    });
  });

  it('reports negative remaining when over budget (not clamped)', () => {
    const over = values({ ...baseline(), STR: 30, CON: 30 });
    const b = computePointBudget({ level: 1, pointsPerLevel: 4, attributeValues: over });
    expect(b.spent).toBe(50);
    expect(b.remaining).toBe(-46);
  });
});
