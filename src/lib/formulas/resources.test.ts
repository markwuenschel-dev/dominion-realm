import { describe, it, expect } from 'vitest';
import {
  computeHPMax,
  computeManaMax,
  computeStaminaMax,
  computeReserveMax,
  computeResourceMaxima,
  computeQ,
  computeAllRatios,
  computeManaFloor,
  computeStaminaFloor,
  computeReserveDebit,
} from './resources';
import {
  HP_COEFFICIENTS,
  MANA_COEFFICIENTS,
  STAMINA_COEFFICIENTS,
  RESERVE_COEFFICIENTS,
  MANA_RESERVE_RATIO,
  STAMINA_RESERVE_RATIO,
  MANA_FLOOR_FRACTION,
  STAMINA_FLOOR_FRACTION,
} from '@/lib/constants';
import type { Attributes, CurrentResources, ResourceMaxima } from '@/types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const NOMINAL: Attributes = {
  CON: 10, END: 10, STR: 10, AGI: 10, DEX: 10,
  INT: 10, WIS: 10, CHA: 10, Faith: 10, Occult: 10,
};

const ZEROS: Attributes = {
  CON: 0, END: 0, STR: 0, AGI: 0, DEX: 0,
  INT: 0, WIS: 0, CHA: 0, Faith: 0, Occult: 0,
};

const MAXED: Attributes = {
  CON: 30, END: 30, STR: 30, AGI: 30, DEX: 30,
  INT: 30, WIS: 30, CHA: 30, Faith: 30, Occult: 30,
};

// ── §1  computeHPMax ─────────────────────────────────────────────────────────

describe('computeHPMax', () => {
  it('applies HP coefficients to the relevant attributes', () => {
    const expected =
      HP_COEFFICIENTS.CON * NOMINAL.CON +
      HP_COEFFICIENTS.END * NOMINAL.END +
      HP_COEFFICIENTS.STR * NOMINAL.STR;
    expect(computeHPMax(NOMINAL)).toBe(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeHPMax(ZEROS)).toBe(0);
  });

  it('scales correctly at attribute maximum (30)', () => {
    const expected =
      HP_COEFFICIENTS.CON * 30 +
      HP_COEFFICIENTS.END * 30 +
      HP_COEFFICIENTS.STR * 30;
    expect(computeHPMax(MAXED)).toBe(expected);
  });

  it('ignores attributes that have no HP coefficient (INT, WIS, etc.)', () => {
    const base = { ...ZEROS, CON: 10 };
    const withExtras = { ...ZEROS, CON: 10, INT: 99, Faith: 99 };
    expect(computeHPMax(base)).toBe(computeHPMax(withExtras));
  });
});

// ── §1  computeManaMax ───────────────────────────────────────────────────────

describe('computeManaMax', () => {
  it('applies Mana coefficients to the relevant attributes', () => {
    const expected =
      MANA_COEFFICIENTS.INT * NOMINAL.INT +
      MANA_COEFFICIENTS.WIS * NOMINAL.WIS +
      MANA_COEFFICIENTS.CHA * NOMINAL.CHA;
    expect(computeManaMax(NOMINAL)).toBe(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeManaMax(ZEROS)).toBe(0);
  });

  it('scales correctly at attribute maximum (30)', () => {
    const expected =
      MANA_COEFFICIENTS.INT * 30 +
      MANA_COEFFICIENTS.WIS * 30 +
      MANA_COEFFICIENTS.CHA * 30;
    expect(computeManaMax(MAXED)).toBe(expected);
  });

  it('reflects asymmetric coefficients (INT weighted highest)', () => {
    const highInt = { ...ZEROS, INT: 10 };
    const highWis = { ...ZEROS, WIS: 10 };
    expect(computeManaMax(highInt)).toBeGreaterThan(computeManaMax(highWis));
  });
});

// ── §1  computeStaminaMax ────────────────────────────────────────────────────

describe('computeStaminaMax', () => {
  it('applies Stamina coefficients to the relevant attributes', () => {
    const expected =
      STAMINA_COEFFICIENTS.END * NOMINAL.END +
      STAMINA_COEFFICIENTS.CON * NOMINAL.CON +
      STAMINA_COEFFICIENTS.STR * NOMINAL.STR +
      STAMINA_COEFFICIENTS.AGI * NOMINAL.AGI +
      STAMINA_COEFFICIENTS.DEX * NOMINAL.DEX;
    expect(computeStaminaMax(NOMINAL)).toBe(expected);
  });

  it('returns 0 when all attributes are 0', () => {
    expect(computeStaminaMax(ZEROS)).toBe(0);
  });

  it('scales correctly at attribute maximum (30)', () => {
    const expected =
      STAMINA_COEFFICIENTS.END * 30 +
      STAMINA_COEFFICIENTS.CON * 30 +
      STAMINA_COEFFICIENTS.STR * 30 +
      STAMINA_COEFFICIENTS.AGI * 30 +
      STAMINA_COEFFICIENTS.DEX * 30;
    expect(computeStaminaMax(MAXED)).toBe(expected);
  });

  it('reflects asymmetric coefficients (END weighted highest)', () => {
    const highEnd = { ...ZEROS, END: 10 };
    const highCon = { ...ZEROS, CON: 10 };
    expect(computeStaminaMax(highEnd)).toBeGreaterThan(computeStaminaMax(highCon));
  });
});

// ── §1  computeReserveMax ────────────────────────────────────────────────────

describe('computeReserveMax', () => {
  it('applies Reserve coefficients to the relevant attributes', () => {
    const base =
      RESERVE_COEFFICIENTS.CON * NOMINAL.CON +
      RESERVE_COEFFICIENTS.END * NOMINAL.END +
      RESERVE_COEFFICIENTS.WIS * NOMINAL.WIS +
      RESERVE_COEFFICIENTS.Faith * NOMINAL.Faith +
      RESERVE_COEFFICIENTS.Occult * NOMINAL.Occult;
    expect(computeReserveMax(NOMINAL)).toBe(base * 1.0);
  });

  it('defaults soul-level modifier to 1.0 when omitted', () => {
    expect(computeReserveMax(NOMINAL)).toBe(computeReserveMax(NOMINAL, 1.0));
  });

  it('scales the base Reserve by the soul-level modifier', () => {
    const base = computeReserveMax(NOMINAL, 1.0);
    expect(computeReserveMax(NOMINAL, 1.5)).toBeCloseTo(base * 1.5);
    expect(computeReserveMax(NOMINAL, 0.5)).toBeCloseTo(base * 0.5);
  });

  it('returns 0 when all attributes are 0 and soulLevelMod = 1', () => {
    expect(computeReserveMax(ZEROS, 1.0)).toBe(0);
  });
});

// ── §1  computeResourceMaxima ────────────────────────────────────────────────

describe('computeResourceMaxima', () => {
  it('returns all four resource maxima consistent with individual computations', () => {
    const soulMod = 1.25;
    const result = computeResourceMaxima(NOMINAL, soulMod);
    expect(result.HP).toBe(computeHPMax(NOMINAL));
    expect(result.Mana).toBe(computeManaMax(NOMINAL));
    expect(result.Stamina).toBe(computeStaminaMax(NOMINAL));
    expect(result.Reserve).toBe(computeReserveMax(NOMINAL, soulMod));
  });

  it('defaults soulLevelMod to 1.0 when omitted', () => {
    const explicit = computeResourceMaxima(NOMINAL, 1.0);
    const implicit = computeResourceMaxima(NOMINAL);
    expect(implicit).toEqual(explicit);
  });

  it('returns all zeros when attributes are all zero', () => {
    const result = computeResourceMaxima(ZEROS, 1.0);
    expect(result).toEqual({ HP: 0, Mana: 0, Stamina: 0, Reserve: 0 });
  });
});

// ── §2  computeQ ─────────────────────────────────────────────────────────────

describe('computeQ', () => {
  it('returns the ratio of current to max', () => {
    expect(computeQ(50, 100)).toBe(0.5);
    expect(computeQ(75, 100)).toBe(0.75);
  });

  it('returns 0.0 when current is 0', () => {
    expect(computeQ(0, 100)).toBe(0);
  });

  it('returns 1.0 when current equals max', () => {
    expect(computeQ(100, 100)).toBe(1);
  });

  it('clamps to 1.0 when current exceeds max', () => {
    expect(computeQ(150, 100)).toBe(1);
    expect(computeQ(999, 1)).toBe(1);
  });

  it('clamps to 0.0 when current is negative', () => {
    expect(computeQ(-10, 100)).toBe(0);
  });

  it('returns 0 when max is 0 (avoids division by zero)', () => {
    expect(computeQ(50, 0)).toBe(0);
    expect(computeQ(0, 0)).toBe(0);
  });
});

// ── §2  computeAllRatios ─────────────────────────────────────────────────────

describe('computeAllRatios', () => {
  it('computes q for each resource independently', () => {
    const current: CurrentResources = { HP: 50, Mana: 25, Stamina: 100, Reserve: 0 };
    const maxima: ResourceMaxima = { HP: 100, Mana: 100, Stamina: 100, Reserve: 80 };
    const ratios = computeAllRatios(current, maxima);
    expect(ratios.HP).toBe(0.5);
    expect(ratios.Mana).toBe(0.25);
    expect(ratios.Stamina).toBe(1.0);
    expect(ratios.Reserve).toBe(0);
  });

  it('all ratios are 0.5 when all current values are half of maxima', () => {
    const maxima = computeResourceMaxima(NOMINAL);
    const current: CurrentResources = {
      HP: maxima.HP / 2,
      Mana: maxima.Mana / 2,
      Stamina: maxima.Stamina / 2,
      Reserve: maxima.Reserve / 2,
    };
    const ratios = computeAllRatios(current, maxima);
    expect(ratios.HP).toBeCloseTo(0.5);
    expect(ratios.Mana).toBeCloseTo(0.5);
    expect(ratios.Stamina).toBeCloseTo(0.5);
    expect(ratios.Reserve).toBeCloseTo(0.5);
  });
});

// ── §6  computeManaFloor ─────────────────────────────────────────────────────

describe('computeManaFloor', () => {
  it('is manaMax × MANA_FLOOR_FRACTION', () => {
    expect(computeManaFloor(100)).toBe(100 * MANA_FLOOR_FRACTION);
    expect(computeManaFloor(200)).toBe(200 * MANA_FLOOR_FRACTION);
  });

  it('is 0 when manaMax is 0', () => {
    expect(computeManaFloor(0)).toBe(0);
  });
});

// ── §6  computeStaminaFloor ──────────────────────────────────────────────────

describe('computeStaminaFloor', () => {
  it('is staminaMax × STAMINA_FLOOR_FRACTION', () => {
    expect(computeStaminaFloor(100)).toBe(100 * STAMINA_FLOOR_FRACTION);
    expect(computeStaminaFloor(50)).toBe(50 * STAMINA_FLOOR_FRACTION);
  });

  it('is 0 when staminaMax is 0', () => {
    expect(computeStaminaFloor(0)).toBe(0);
  });
});

// ── §6  computeReserveDebit ──────────────────────────────────────────────────

describe('computeReserveDebit', () => {
  it('converts forced Mana deficit to Reserve at the 5:1 ratio', () => {
    expect(computeReserveDebit(10, 0)).toBe(10 / MANA_RESERVE_RATIO);
  });

  it('converts forced Stamina deficit to Reserve at the 5:1 ratio', () => {
    expect(computeReserveDebit(0, 10)).toBe(10 / STAMINA_RESERVE_RATIO);
  });

  it('sums both conversions when both deficits are non-zero', () => {
    const expected = 10 / MANA_RESERVE_RATIO + 15 / STAMINA_RESERVE_RATIO;
    expect(computeReserveDebit(10, 15)).toBeCloseTo(expected);
  });

  it('returns 0 when there are no deficits', () => {
    expect(computeReserveDebit(0, 0)).toBe(0);
  });
});
