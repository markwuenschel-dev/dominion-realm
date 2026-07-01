import { describe, it, expect } from 'vitest';
import { computeActivityRegenRates } from './activityRegen';
import type { FinalResources } from '@/types/characterSheet';
import type { Attributes } from '@/types';

/**
 * §7 activity-based regeneration (resource_system.md §7). A pure function: given a
 * character's final resource maxima and CON/END/WIS, it produces the per-activity
 * recovery rates (safeRest, meditation, combat, …), each rounded to 2 decimals.
 * Distinct from the §4 safe-low curve in regeneration.ts.
 */

const attrs = (over: Partial<Attributes> = {}): Attributes => ({
  CON: 14,
  END: 10,
  STR: 5,
  AGI: 5,
  DEX: 5,
  INT: 5,
  WIS: 20,
  CHA: 5,
  Faith: 5,
  Occult: 5,
  ...over,
});

const final: FinalResources = { HP: 200, Mana: 100, Stamina: 150, Reserve: 80 };

describe('computeActivityRegenRates — §7 activity model', () => {
  it('computes per-activity rates from final resources + CON/END/WIS', () => {
    const r = computeActivityRegenRates(final, attrs());

    expect(r.HP).toEqual({ safeRest: 13, lightRest: 6.5, activeTravel: 1, combat: 0 });
    expect(r.Mana).toEqual({ meditation: 9, calmNoncombat: 4, activeTravel: 1, combat: 0.5 });
    expect(r.Stamina).toEqual({
      fullRest: 23,
      catchingBreath: 15.33, // 150·0.08 + 10/3 = 15.3333 → 15.33
      lightMovement: 4.5,
      combat: 1.5,
    });
    expect(r.Reserve).toEqual({
      deepSleep: 11.4,
      meditation: 8,
      ordinaryRest: 2.4,
      activeTravel: 0.8,
      combat: 0,
    });
  });

  it('rounds every rate to at most two decimals', () => {
    const r = computeActivityRegenRates(final, attrs({ END: 7, WIS: 13 }));
    const allRates = [
      ...Object.values(r.HP),
      ...Object.values(r.Mana),
      ...Object.values(r.Stamina),
      ...Object.values(r.Reserve),
    ];
    for (const rate of allRates) {
      expect(Math.round(rate * 100) / 100).toBe(rate);
    }
  });

  it('holds HP.combat and Reserve.combat at exactly zero', () => {
    const r = computeActivityRegenRates(final, attrs());
    expect(r.HP.combat).toBe(0);
    expect(r.Reserve.combat).toBe(0);
  });
});
