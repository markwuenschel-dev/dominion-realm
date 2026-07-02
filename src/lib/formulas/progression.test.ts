import { describe, it, expect } from 'vitest';
import { getSoulMultiplier } from './progression';
import type { SoulLevelKey } from '@/lib/characterTemplates';

/**
 * §6 soul multiplier — the pure progression math that stays in progression.ts.
 * (The old §15 polynomial XP curve and §14 class-bonus-point cadence were removed
 * per canon; the XP model now lives in lib/xpFormulas.ts.)
 */

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
