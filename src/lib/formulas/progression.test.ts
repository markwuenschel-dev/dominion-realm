import { describe, it, expect } from 'vitest';
import { computeBaseXP, computeClassBonusPoints, getSoulMultiplier } from './progression';
import type { SoulLevelKey } from '@/lib/characterTemplates';

/**
 * §15 XP curve, §14 class bonus points, §6 soul multiplier — the pure progression
 * maths previously buried in characterTemplates.ts. These pin the boundary cases the
 * old god-file left untested.
 */

describe('computeBaseXP — §15  75L + 25L·log₂(L+1) + 4L(L−1)', () => {
  it('returns 0 for levels below 1 (guard)', () => {
    expect(computeBaseXP(0)).toBe(0);
    expect(computeBaseXP(-5)).toBe(0);
  });

  it('computes level 1 as an exact round number (log₂(2) = 1)', () => {
    // 75·1 + 25·1·1 + 4·1·0 = 100
    expect(computeBaseXP(1)).toBe(100);
  });

  it('rounds the fractional log₂ term at level 2', () => {
    // 150 + 50·log₂(3) + 8 = 237.248… → 237
    expect(computeBaseXP(2)).toBe(237);
  });

  it('increases monotonically across levels', () => {
    const xs = [1, 2, 5, 10, 25, 50].map(computeBaseXP);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]!);
    }
  });
});

describe('computeClassBonusPoints — §14  ⌊max(0, char − acq) / cadence⌋', () => {
  it('returns 0 when cadence is 0 or negative (unclassed guard)', () => {
    expect(computeClassBonusPoints(50, 1, 0)).toBe(0);
    expect(computeClassBonusPoints(50, 1, -3)).toBe(0);
  });

  it('clamps a negative level delta to 0 (acquired above current level)', () => {
    expect(computeClassBonusPoints(3, 10, 5)).toBe(0);
  });

  it('floors the level delta over the cadence', () => {
    expect(computeClassBonusPoints(1, 1, 5)).toBe(0); // 0/5
    expect(computeClassBonusPoints(10, 1, 5)).toBe(1); // ⌊9/5⌋
    expect(computeClassBonusPoints(11, 1, 5)).toBe(2); // ⌊10/5⌋
    expect(computeClassBonusPoints(16, 1, 5)).toBe(3); // exact 15/5
  });
});

describe('getSoulMultiplier — §6 ladder lookup', () => {
  it('returns the canonical multiplier for known keys', () => {
    expect(getSoulMultiplier('Common')).toBe(1.0);
    expect(getSoulMultiplier('Fractured')).toBe(0.9);
    expect(getSoulMultiplier('Absolute')).toBe(1.3);
  });

  it('falls back to 1.0 for an unknown key', () => {
    expect(getSoulMultiplier('NotASoulLevel' as SoulLevelKey)).toBe(1.0);
  });
});
