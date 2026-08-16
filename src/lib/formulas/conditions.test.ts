import { describe, it, expect } from 'vitest';
import {
  computePenetration,
  computeDamagePenetration,
  computePoisonPenetration,
  computeFearPenetration,
  computeCursePenetration,
  computePoisonResistance,
  computeStaggerResistance,
  computeManaCrashResistance,
  computeThresholdWidth,
  computeSeverity,
  stepConditionLoad,
  computeApplicationRate,
} from './conditions';
import {
  POISON_RESISTANCE_COEFFICIENTS,
  STAGGER_RESISTANCE_COEFFICIENTS,
  MANA_CRASH_RESISTANCE_COEFFICIENTS,
} from '@/lib/constants';
import type { Attributes } from '@/types';
import { LOCKED_ATTRS_FIXTURE } from './lockedAttributesFixture';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOMINAL: Attributes = {
  CON: 10,
  END: 10,
  STR: 10,
  AGI: 10,
  DEX: 10,
  INT: 10,
  WIS: 10,
  CHA: 10,
  CVN: 10,
  MYS: 10,
};

const ZEROS: Attributes = {
  CON: 0,
  END: 0,
  STR: 0,
  AGI: 0,
  DEX: 0,
  INT: 0,
  WIS: 0,
  CHA: 0,
  CVN: 0,
  MYS: 0,
};

// ── §10  computePenetration ───────────────────────────────────────────────────

describe('computePenetration', () => {
  it('returns 0 penetration when sourceAccess is 0', () => {
    const result = computePenetration({ sourceAccess: 0, barrier: 10, alpha: 1 });
    expect(result.penetration).toBe(0);
    expect(result.label).toBe('0%');
  });

  it('returns 0 penetration when sourceAccess is negative', () => {
    const result = computePenetration({ sourceAccess: -5, barrier: 10, alpha: 1 });
    expect(result.penetration).toBe(0);
  });

  it('returns 0.5 when sourceAccess equals barrier (alpha=1)', () => {
    const result = computePenetration({ sourceAccess: 10, barrier: 10, alpha: 1 });
    expect(result.penetration).toBeCloseTo(0.5);
  });

  it('returns >0.5 when sourceAccess exceeds barrier', () => {
    const result = computePenetration({ sourceAccess: 20, barrier: 10, alpha: 1 });
    expect(result.penetration).toBeGreaterThan(0.5);
  });

  it('returns <0.5 when sourceAccess is below barrier', () => {
    const result = computePenetration({ sourceAccess: 5, barrier: 10, alpha: 1 });
    expect(result.penetration).toBeLessThan(0.5);
  });

  it('approaches 1.0 when sourceAccess greatly exceeds barrier', () => {
    const result = computePenetration({ sourceAccess: 1000, barrier: 1, alpha: 1 });
    expect(result.penetration).toBeGreaterThan(0.99);
  });

  it('applies the hill-coefficient alpha to sharpen the transition', () => {
    const softer = computePenetration({ sourceAccess: 8, barrier: 10, alpha: 1 });
    const steeper = computePenetration({ sourceAccess: 8, barrier: 10, alpha: 3 });
    // Higher alpha → less penetration when below barrier
    expect(steeper.penetration).toBeLessThan(softer.penetration);
  });

  it('label reflects penetration as a percentage with one decimal place', () => {
    const result = computePenetration({ sourceAccess: 10, barrier: 10, alpha: 1 });
    expect(result.label).toBe('50.0%');
  });

  it('returns penetration in [0, 1] for any positive inputs', () => {
    const cases = [
      { sourceAccess: 1, barrier: 100, alpha: 1 },
      { sourceAccess: 100, barrier: 1, alpha: 1 },
      { sourceAccess: 50, barrier: 50, alpha: 2 },
    ];
    for (const input of cases) {
      const { penetration } = computePenetration(input);
      expect(penetration).toBeGreaterThanOrEqual(0);
      expect(penetration).toBeLessThanOrEqual(1);
    }
  });
});

// ── §10  Typed penetration wrappers ───────────────────────────────────────────

describe('computeDamagePenetration', () => {
  it('returns the same value as computePenetration with the same inputs', () => {
    expect(computeDamagePenetration(12, 8, 1)).toBeCloseTo(
      computePenetration({ sourceAccess: 12, barrier: 8, alpha: 1 }).penetration,
    );
  });

  it('defaults alpha to 1', () => {
    expect(computeDamagePenetration(10, 10)).toBeCloseTo(0.5);
  });
});

describe('computePoisonPenetration', () => {
  it('returns the same value as computePenetration with the same inputs', () => {
    expect(computePoisonPenetration(5, 15, 1)).toBeCloseTo(
      computePenetration({ sourceAccess: 5, barrier: 15, alpha: 1 }).penetration,
    );
  });
});

describe('computeFearPenetration', () => {
  it('returns 0 when threatPressure is 0', () => {
    expect(computeFearPenetration(0, 10)).toBe(0);
  });
});

describe('computeCursePenetration', () => {
  it('returns 0 when curseImprintPower is 0', () => {
    expect(computeCursePenetration(0, 10)).toBe(0);
  });
});

// ── §11.1  Resistance formulas ────────────────────────────────────────────────

describe('computePoisonResistance', () => {
  it('applies Poison resistance coefficients (CON + 0.5·WIS)', () => {
    const expected =
      POISON_RESISTANCE_COEFFICIENTS.CON * NOMINAL.CON +
      POISON_RESISTANCE_COEFFICIENTS.WIS * NOMINAL.WIS;
    expect(computePoisonResistance(NOMINAL)).toBeCloseTo(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computePoisonResistance(ZEROS)).toBe(0);
  });

  it('CON contributes more than WIS at equal attribute values', () => {
    const highCon = { ...ZEROS, CON: 10 };
    const highWis = { ...ZEROS, WIS: 10 };
    // CON coefficient (1.0) > WIS coefficient (0.5)
    expect(computePoisonResistance(highCon)).toBeGreaterThan(computePoisonResistance(highWis));
  });

  // Locked expansion (audit RHA-11): 1.0·CON+0.5·WIS = 1.0·12+0.5·15 = 19.5.
  it('equals the locked 1.0·CON + 0.5·WIS expansion (19.5)', () => {
    expect(computePoisonResistance(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(19.5, 2);
  });
});

describe('computeStaggerResistance', () => {
  it('applies Stagger resistance coefficients (0.5·STR + 0.3·END + 0.2·AGI)', () => {
    const expected =
      STAGGER_RESISTANCE_COEFFICIENTS.STR * NOMINAL.STR +
      STAGGER_RESISTANCE_COEFFICIENTS.END * NOMINAL.END +
      STAGGER_RESISTANCE_COEFFICIENTS.AGI * NOMINAL.AGI;
    expect(computeStaggerResistance(NOMINAL)).toBeCloseTo(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeStaggerResistance(ZEROS)).toBe(0);
  });

  it('ignores attributes outside the formula (WIS, INT, etc.)', () => {
    const base = { ...ZEROS, STR: 10 };
    const withExtras = { ...ZEROS, STR: 10, WIS: 99, INT: 99 };
    expect(computeStaggerResistance(base)).toBeCloseTo(computeStaggerResistance(withExtras));
  });

  // Locked expansion (audit RHA-11): 0.5·STR+0.3·END+0.2·AGI = 0.5·3+0.3·8+0.2·4 = 4.7.
  it('equals the locked 0.5·STR + 0.3·END + 0.2·AGI expansion (4.7)', () => {
    expect(computeStaggerResistance(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(4.7, 2);
  });
});

describe('computeManaCrashResistance', () => {
  it('applies ManaCrash resistance coefficients (0.5·WIS + 0.3·INT + 0.2·CON)', () => {
    const expected =
      MANA_CRASH_RESISTANCE_COEFFICIENTS.WIS * NOMINAL.WIS +
      MANA_CRASH_RESISTANCE_COEFFICIENTS.INT * NOMINAL.INT +
      MANA_CRASH_RESISTANCE_COEFFICIENTS.CON * NOMINAL.CON;
    expect(computeManaCrashResistance(NOMINAL)).toBeCloseTo(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeManaCrashResistance(ZEROS)).toBe(0);
  });

  // Locked expansion (audit RHA-11): 0.5·WIS+0.3·INT+0.2·CON = 0.5·15+0.3·20+0.2·12 = 15.9.
  it('equals the locked 0.5·WIS + 0.3·INT + 0.2·CON expansion (15.9)', () => {
    expect(computeManaCrashResistance(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(15.9, 2);
  });
});

// ── §11.2  computeThresholdWidth ──────────────────────────────────────────────

describe('computeThresholdWidth', () => {
  it('returns baseWidth × elasticity × adaptation × stability', () => {
    expect(computeThresholdWidth(10, 1.2, 0.9, 1.1)).toBeCloseTo(10 * 1.2 * 0.9 * 1.1);
  });

  it('defaults all modifiers to 1.0 when omitted', () => {
    expect(computeThresholdWidth(10)).toBe(10);
  });

  it('returns 0 when baseWidth is 0', () => {
    expect(computeThresholdWidth(0, 2.0, 2.0, 2.0)).toBe(0);
  });
});

// ── §11  computeSeverity ─────────────────────────────────────────────────────

describe('computeSeverity', () => {
  it("band is 'none' when load is below resistance (condition resisted)", () => {
    const result = computeSeverity({ load: 5, resistance: 10, thresholdWidth: 5 });
    expect(result.band).toBe('none');
    expect(result.severity).toBeLessThan(0);
  });

  it("band is 'minor' when load exactly equals resistance (severity = 0, lower bound of minor)", () => {
    // Spec: < 0 → none; 0–<1 → minor. Severity = 0 is the entry point for minor, not 'none'.
    const result = computeSeverity({ load: 10, resistance: 10, thresholdWidth: 5 });
    expect(result.band).toBe('minor');
    expect(result.severity).toBe(0);
  });

  it("band is 'minor' when 0 ≤ severity < 1 (load just exceeds resistance)", () => {
    // severity = (load - resistance) / width = (14 - 10) / 5 = 0.8
    const result = computeSeverity({ load: 14, resistance: 10, thresholdWidth: 5 });
    expect(result.band).toBe('minor');
  });

  it("band is 'moderate' when 1 ≤ severity < 2", () => {
    // severity = (load - resistance) / width = (20 - 10) / 5 = 2 → severe boundary
    // use: (17 - 10) / 5 = 1.4 → moderate
    const result = computeSeverity({ load: 17, resistance: 10, thresholdWidth: 5 });
    expect(result.band).toBe('moderate');
  });

  it("band is 'severe' when 2 ≤ severity < 3", () => {
    // severity = (22 - 10) / 5 = 2.4
    const result = computeSeverity({ load: 22, resistance: 10, thresholdWidth: 5 });
    expect(result.band).toBe('severe');
  });

  it("band is 'catastrophic' when severity ≥ 3", () => {
    // severity = (25 - 10) / 5 = 3.0
    const result = computeSeverity({ load: 25, resistance: 10, thresholdWidth: 5 });
    expect(result.band).toBe('catastrophic');
  });

  it('returns a safe invalid result when thresholdWidth is 0', () => {
    const result = computeSeverity({ load: 20, resistance: 5, thresholdWidth: 0 });
    expect(result.band).toBe('none');
    expect(result.severity).toBe(0);
  });

  it('description is a non-empty string for every band', () => {
    const inputs = [
      { load: 5, resistance: 10, thresholdWidth: 5 }, // none
      { load: 14, resistance: 10, thresholdWidth: 5 }, // minor
      { load: 17, resistance: 10, thresholdWidth: 5 }, // moderate
      { load: 22, resistance: 10, thresholdWidth: 5 }, // severe
      { load: 25, resistance: 10, thresholdWidth: 5 }, // catastrophic
    ];
    for (const input of inputs) {
      expect(computeSeverity(input).description.length).toBeGreaterThan(0);
    }
  });
});

// ── §9.1  stepConditionLoad ───────────────────────────────────────────────────

describe('stepConditionLoad', () => {
  it('increases load when application exceeds clearance', () => {
    expect(stepConditionLoad(10, 5, 2, 1)).toBeCloseTo(13);
  });

  it('decreases load when clearance exceeds application', () => {
    expect(stepConditionLoad(10, 2, 5, 1)).toBeCloseTo(7);
  });

  it('clamps load at 0 — never goes negative', () => {
    expect(stepConditionLoad(2, 0, 10, 1)).toBe(0);
  });

  it('defaults dt to 1.0 when omitted', () => {
    expect(stepConditionLoad(10, 5, 2)).toBeCloseTo(stepConditionLoad(10, 5, 2, 1));
  });

  it('scales delta by dt', () => {
    expect(stepConditionLoad(10, 4, 2, 2)).toBeCloseTo(14); // delta = (4-2)*2 = 4
  });
});

// ── §9.1  computeApplicationRate ─────────────────────────────────────────────

describe('computeApplicationRate', () => {
  it('returns intensity × exposure × penetration × susceptibility', () => {
    expect(computeApplicationRate(2, 3, 0.5, 1.2)).toBeCloseTo(2 * 3 * 0.5 * 1.2);
  });

  it('defaults susceptibility to 1.0 when omitted', () => {
    expect(computeApplicationRate(2, 3, 0.5)).toBeCloseTo(2 * 3 * 0.5);
  });

  it('returns 0 when penetration is 0', () => {
    expect(computeApplicationRate(100, 100, 0)).toBe(0);
  });
});
