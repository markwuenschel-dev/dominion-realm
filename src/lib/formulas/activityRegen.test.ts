// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/activityRegen.test.ts
// §7  Activity-based regeneration — separate from the §4/5 safe-low regen curve.
// Pins the exact 2-decimal-place rounded outputs so the sheet cannot drift.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { computeActivityRegenRates } from './activityRegen';

// final resources fixed independently of attributes so the two inputs are visible
const FINAL = { HP: 100, Mana: 80, Stamina: 90, Reserve: 60 };
const ATTRS = { CON: 12, END: 10, WIS: 14 };

describe('computeActivityRegenRates (§7 activity-based)', () => {
  const r = computeActivityRegenRates(FINAL, ATTRS);

  it('HP block: finalHP·rate + CON term, 2dp', () => {
    expect(r.HP).toEqual({
      safeRest: 9, // 100*0.03 + 12/2
      lightRest: 4.5, // 100*0.015 + 12/4
      activeTravel: 0.5, // 100*0.005
      combat: 0,
    });
  });

  it('Mana block: finalMana·rate + WIS term, 2dp', () => {
    expect(r.Mana).toEqual({
      meditation: 6.8, // 80*0.05 + 14/5
      calmNoncombat: 3, // 80*0.02 + 14/10
      activeTravel: 0.8, // 80*0.01
      combat: 0.4, // 80*0.005
    });
  });

  it('Stamina block: finalStamina·rate + END term, rounds thirds to 2dp', () => {
    expect(r.Stamina).toEqual({
      fullRest: 15.8, // 90*0.12 + 10/2
      catchingBreath: 10.53, // 90*0.08 + 10/3 = 10.5333 → 10.53
      lightMovement: 2.7, // 90*0.03
      combat: 0.9, // 90*0.01
    });
  });

  it('Reserve block: finalReserve·rate + WIS term, 2dp', () => {
    expect(r.Reserve).toEqual({
      deepSleep: 8.3, // 60*0.08 + 14/4
      meditation: 5.8, // 60*0.05 + 14/5
      ordinaryRest: 1.8, // 60*0.03
      activeTravel: 0.6, // 60*0.01
      combat: 0,
    });
  });
});
