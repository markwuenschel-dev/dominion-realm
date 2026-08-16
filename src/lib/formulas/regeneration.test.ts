import { describe, it, expect } from 'vitest';
import {
  computeBaseHPRegen,
  computeBaseManaRegen,
  computeBaseStaminaRegen,
  computeBaseReserveRegen,
  computeBaseRegen,
  getRegenZone,
  computeRegenMultiplier,
  computeActualRegen,
  sampleRegenCurve,
  computeRegenResult,
  computeAllRegenResults,
} from './regeneration';
import {
  HP_REGEN_COEFFICIENTS,
  MANA_REGEN_COEFFICIENTS,
  STAMINA_REGEN_COEFFICIENTS,
  RESERVE_REGEN_COEFFICIENTS,
  DEFAULT_REGEN_CURVE_PARAMS,
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

const PARAMS = DEFAULT_REGEN_CURVE_PARAMS; // { q_s: 0.1, gamma: 0.45, p: 2 }

// ── §3  Base regen per resource ───────────────────────────────────────────────

describe('computeBaseHPRegen', () => {
  it('applies HP regen coefficients to CON, END, WIS', () => {
    const expected =
      HP_REGEN_COEFFICIENTS.CON * NOMINAL.CON +
      HP_REGEN_COEFFICIENTS.END * NOMINAL.END +
      HP_REGEN_COEFFICIENTS.WIS * NOMINAL.WIS;
    expect(computeBaseHPRegen(NOMINAL)).toBeCloseTo(expected);
  });

  // Locked expansion (audit RHA-11): 0.5·CON+0.3·END+0.2·WIS = 0.5·12+0.3·8+0.2·15
  // = 11.4. Numeric literal, not re-derived from HP_REGEN_COEFFICIENTS, per the
  // shared locked-attributes fixture convention (CONTEXT.md, formulas section).
  it('equals the locked 0.50·CON + 0.30·END + 0.20·WIS expansion (11.4)', () => {
    expect(computeBaseHPRegen(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(11.4, 2);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeBaseHPRegen(ZEROS)).toBe(0);
  });

  it('ignores attributes with no HP regen coefficient (INT, CVN, etc.)', () => {
    const base = { ...ZEROS, CON: 10 };
    const withExtras = { ...ZEROS, CON: 10, INT: 99, CVN: 99 };
    expect(computeBaseHPRegen(base)).toBeCloseTo(computeBaseHPRegen(withExtras));
  });
});

describe('computeBaseManaRegen', () => {
  it('applies Mana regen coefficients to INT, WIS, CHA', () => {
    const expected =
      MANA_REGEN_COEFFICIENTS.INT * NOMINAL.INT +
      MANA_REGEN_COEFFICIENTS.WIS * NOMINAL.WIS +
      MANA_REGEN_COEFFICIENTS.CHA * NOMINAL.CHA;
    expect(computeBaseManaRegen(NOMINAL)).toBeCloseTo(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeBaseManaRegen(ZEROS)).toBe(0);
  });

  it('reflects asymmetric coefficients (WIS weighted highest)', () => {
    const highWis = { ...ZEROS, WIS: 10 };
    const highInt = { ...ZEROS, INT: 10 };
    // WIS coefficient (0.55) > INT coefficient (0.25)
    expect(computeBaseManaRegen(highWis)).toBeGreaterThan(computeBaseManaRegen(highInt));
  });

  // Locked expansion (audit RHA-11): 0.25·INT+0.55·WIS+0.2·CHA = 0.25·20+0.55·15+0.2·7 = 14.65.
  it('equals the locked 0.25·INT + 0.55·WIS + 0.20·CHA expansion (14.65)', () => {
    expect(computeBaseManaRegen(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(14.65, 2);
  });
});

describe('computeBaseStaminaRegen', () => {
  it('applies Stamina regen coefficients to END, CON, AGI, WIS', () => {
    const expected =
      STAMINA_REGEN_COEFFICIENTS.END * NOMINAL.END +
      STAMINA_REGEN_COEFFICIENTS.CON * NOMINAL.CON +
      STAMINA_REGEN_COEFFICIENTS.AGI * NOMINAL.AGI +
      STAMINA_REGEN_COEFFICIENTS.WIS * NOMINAL.WIS;
    expect(computeBaseStaminaRegen(NOMINAL)).toBeCloseTo(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeBaseStaminaRegen(ZEROS)).toBe(0);
  });

  // Locked expansion (audit RHA-11): 0.55·END+0.25·CON+0.1·AGI+0.1·WIS
  // = 0.55·8+0.25·12+0.1·4+0.1·15 = 9.3.
  it('equals the locked 0.55·END + 0.25·CON + 0.10·AGI + 0.10·WIS expansion (9.3)', () => {
    expect(computeBaseStaminaRegen(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(9.3, 2);
  });
});

describe('computeBaseReserveRegen', () => {
  it('applies Reserve regen coefficients to CON, END, WIS, CVN, MYS', () => {
    const expected =
      RESERVE_REGEN_COEFFICIENTS.CON * NOMINAL.CON +
      RESERVE_REGEN_COEFFICIENTS.END * NOMINAL.END +
      RESERVE_REGEN_COEFFICIENTS.WIS * NOMINAL.WIS +
      RESERVE_REGEN_COEFFICIENTS.CVN * NOMINAL.CVN +
      RESERVE_REGEN_COEFFICIENTS.MYS * NOMINAL.MYS;
    expect(computeBaseReserveRegen(NOMINAL)).toBeCloseTo(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeBaseReserveRegen(ZEROS)).toBe(0);
  });

  // Locked expansion (audit RHA-11): 0.2·CON+0.2·END+0.3·WIS+0.15·CVN+0.15·MYS
  // = 0.2·12+0.2·8+0.3·15+0.15·9+0.15·11 = 11.5.
  it('equals the locked 0.20·CON + 0.20·END + 0.30·WIS + 0.15·CVN + 0.15·MYS expansion (11.5)', () => {
    expect(computeBaseReserveRegen(LOCKED_ATTRS_FIXTURE)).toBeCloseTo(11.5, 2);
  });
});

describe('computeBaseRegen', () => {
  it('returns individual regen values consistent with per-resource functions', () => {
    const result = computeBaseRegen(NOMINAL);
    expect(result.HP).toBeCloseTo(computeBaseHPRegen(NOMINAL));
    expect(result.Mana).toBeCloseTo(computeBaseManaRegen(NOMINAL));
    expect(result.Stamina).toBeCloseTo(computeBaseStaminaRegen(NOMINAL));
    expect(result.Reserve).toBeCloseTo(computeBaseReserveRegen(NOMINAL));
  });

  it('returns all zeros when attributes are all zero', () => {
    const result = computeBaseRegen(ZEROS);
    expect(result).toEqual({ HP: 0, Mana: 0, Stamina: 0, Reserve: 0 });
  });
});

// ── §4  Zone classification ───────────────────────────────────────────────────

describe('getRegenZone', () => {
  it("returns 'zero' when q is exactly 0", () => {
    expect(getRegenZone(0, PARAMS.q_s)).toBe('zero');
  });

  it("returns 'zero' when q is negative", () => {
    expect(getRegenZone(-0.1, PARAMS.q_s)).toBe('zero');
  });

  it("returns 'failure' when 0 < q < q_s", () => {
    expect(getRegenZone(0.05, PARAMS.q_s)).toBe('failure');
  });

  it("returns 'safe' when q equals q_s (safe-low threshold)", () => {
    expect(getRegenZone(PARAMS.q_s, PARAMS.q_s)).toBe('safe');
  });

  it("returns 'safe' when q is above q_s", () => {
    expect(getRegenZone(0.5, PARAMS.q_s)).toBe('safe');
    expect(getRegenZone(1.0, PARAMS.q_s)).toBe('safe');
  });
});

// ── §4  computeRegenMultiplier ────────────────────────────────────────────────

describe('computeRegenMultiplier', () => {
  it('returns 0 when q is 0 (zero zone)', () => {
    expect(computeRegenMultiplier(0, PARAMS)).toBe(0);
  });

  it('returns 0 when q is negative', () => {
    expect(computeRegenMultiplier(-0.5, PARAMS)).toBe(0);
  });

  it('returns 1.0 at the safe-low threshold (q = q_s) — maximum regen point', () => {
    // At q_s: safe zone formula = ((1 - q_s)/(1 - q_s))^gamma = 1^gamma = 1
    expect(computeRegenMultiplier(PARAMS.q_s, PARAMS)).toBeCloseTo(1.0);
  });

  it('returns 0 when q = 1 (fully recovered — no regen needed)', () => {
    // safe zone: ((1-1)/(1-q_s))^gamma = 0
    expect(computeRegenMultiplier(1, PARAMS)).toBeCloseTo(0);
  });

  it('applies failure-zone formula (q/q_s)^p when 0 < q < q_s', () => {
    const q = 0.05;
    const expected = Math.pow(q / PARAMS.q_s, PARAMS.p);
    expect(computeRegenMultiplier(q, PARAMS)).toBeCloseTo(expected);
  });

  it('applies safe-zone formula ((1-q)/(1-q_s))^gamma when q >= q_s', () => {
    const q = 0.5;
    const expected = Math.pow((1 - q) / (1 - PARAMS.q_s), PARAMS.gamma);
    expect(computeRegenMultiplier(q, PARAMS)).toBeCloseTo(expected);
  });

  it('uses DEFAULT_REGEN_CURVE_PARAMS when params are omitted', () => {
    const q = 0.5;
    expect(computeRegenMultiplier(q)).toBeCloseTo(computeRegenMultiplier(q, PARAMS));
  });

  it('regen in safe zone decreases monotonically as q rises from q_s to 1', () => {
    const qValues = [0.1, 0.3, 0.5, 0.7, 0.9, 1.0];
    const multipliers = qValues.map((q) => computeRegenMultiplier(q, PARAMS));
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeLessThanOrEqual(multipliers[i - 1]);
    }
  });

  it('regen in failure zone increases monotonically as q rises from 0 to q_s', () => {
    const qValues = [0.01, 0.03, 0.05, 0.07, 0.09];
    const multipliers = qValues.map((q) => computeRegenMultiplier(q, PARAMS));
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1]);
    }
  });
});

// ── §4  computeActualRegen ────────────────────────────────────────────────────

describe('computeActualRegen', () => {
  it('returns baseRegen × recoveryStateMod × multiplier', () => {
    const q = 0.5;
    const baseRegen = 10;
    const rsm = 1.5;
    const multiplier = computeRegenMultiplier(q, PARAMS);
    expect(computeActualRegen(baseRegen, q, rsm, PARAMS)).toBeCloseTo(baseRegen * rsm * multiplier);
  });

  it('returns 0 when q is 0 regardless of base regen', () => {
    expect(computeActualRegen(100, 0, 1.0, PARAMS)).toBe(0);
  });

  it('defaults recoveryStateMod to 1.0 when omitted', () => {
    expect(computeActualRegen(10, 0.5, 1.0, PARAMS)).toBeCloseTo(
      computeActualRegen(10, 0.5, undefined as unknown as number, PARAMS),
    );
  });
});

// ── §4.4  sampleRegenCurve ────────────────────────────────────────────────────

describe('sampleRegenCurve', () => {
  it('returns steps+1 samples spanning q from 0 to 1', () => {
    const samples = sampleRegenCurve(PARAMS, 100);
    expect(samples).toHaveLength(101);
    expect(samples[0].q).toBe(0);
    expect(samples[100].q).toBe(1);
  });

  it('first sample (q=0) has multiplier 0 and zone "zero"', () => {
    const [first] = sampleRegenCurve(PARAMS);
    expect(first.multiplier).toBe(0);
    expect(first.zone).toBe('zero');
  });

  it('last sample (q=1) has multiplier ~0 and zone "safe"', () => {
    const samples = sampleRegenCurve(PARAMS);
    const last = samples[samples.length - 1];
    expect(last.multiplier).toBeCloseTo(0);
    expect(last.zone).toBe('safe');
  });

  it('each sample multiplier matches computeRegenMultiplier for its q', () => {
    const samples = sampleRegenCurve(PARAMS, 10);
    for (const s of samples) {
      expect(s.multiplier).toBeCloseTo(computeRegenMultiplier(s.q, PARAMS));
    }
  });

  it('uses DEFAULT_REGEN_CURVE_PARAMS when params are omitted', () => {
    const defaultSamples = sampleRegenCurve();
    const explicitSamples = sampleRegenCurve(PARAMS);
    expect(defaultSamples[50].multiplier).toBeCloseTo(explicitSamples[50].multiplier);
  });
});

// ── §5  computeRegenResult ────────────────────────────────────────────────────

describe('computeRegenResult', () => {
  it('returns a result with resource, baseRegen, multiplier, actualRegen, zone', () => {
    const result = computeRegenResult('HP', 10, 0.5, 1.0, PARAMS);
    expect(result.resource).toBe('HP');
    expect(result.baseRegen).toBe(10);
    expect(result.zone).toBe('safe');
    expect(result.multiplier).toBeCloseTo(computeRegenMultiplier(0.5, PARAMS));
    expect(result.actualRegen).toBeCloseTo(10 * 1.0 * result.multiplier);
  });

  it('actualRegen is 0 in the zero zone regardless of baseRegen', () => {
    const result = computeRegenResult('Mana', 50, 0, 1.0, PARAMS);
    expect(result.zone).toBe('zero');
    expect(result.actualRegen).toBe(0);
  });

  it('applies the recoveryStateMod to actualRegen', () => {
    const base = computeRegenResult('Stamina', 10, 0.5, 1.0, PARAMS);
    const doubled = computeRegenResult('Stamina', 10, 0.5, 2.0, PARAMS);
    expect(doubled.actualRegen).toBeCloseTo(base.actualRegen * 2);
  });
});

// ── §5  computeAllRegenResults ────────────────────────────────────────────────

describe('computeAllRegenResults', () => {
  const ratios = { HP: 0.5, Mana: 0.3, Stamina: 0.8, Reserve: 0.0 };

  it('returns four results — one per resource', () => {
    const results = computeAllRegenResults(NOMINAL, ratios, 1.0, PARAMS);
    expect(results).toHaveLength(4);
    const resources = results.map((r) => r.resource);
    expect(resources).toContain('HP');
    expect(resources).toContain('Mana');
    expect(resources).toContain('Stamina');
    expect(resources).toContain('Reserve');
  });

  it('each result is consistent with computeRegenResult for its resource', () => {
    const results = computeAllRegenResults(NOMINAL, ratios, 1.5, PARAMS);
    const base = computeBaseRegen(NOMINAL);

    const hp = results.find((r) => r.resource === 'HP')!;
    const expected = computeRegenResult('HP', base.HP, ratios.HP, 1.5, PARAMS);
    expect(hp.actualRegen).toBeCloseTo(expected.actualRegen);
  });

  it('Reserve has actualRegen = 0 when its q ratio is 0', () => {
    const results = computeAllRegenResults(NOMINAL, { ...ratios, Reserve: 0 }, 1.0, PARAMS);
    const reserve = results.find((r) => r.resource === 'Reserve')!;
    expect(reserve.actualRegen).toBe(0);
    expect(reserve.zone).toBe('zero');
  });

  it('defaults recoveryStateMod to 1.0 and uses DEFAULT_REGEN_CURVE_PARAMS when omitted', () => {
    const explicit = computeAllRegenResults(NOMINAL, ratios, 1.0, PARAMS);
    const implicit = computeAllRegenResults(NOMINAL, ratios);
    for (let i = 0; i < 4; i++) {
      expect(implicit[i].actualRegen).toBeCloseTo(explicit[i].actualRegen);
    }
  });
});
