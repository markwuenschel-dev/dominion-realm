import { describe, it, expect } from 'vitest';
import {
  computeHealingPenetration,
  computeCompatibilityFromKappa,
  computeAbsorption,
  computeAllocationWeights,
  computeAllocations,
  computeChannelRepair,
  computeHealingPulse,
  stepWoundField,
  computeInjuryLoad,
  computeCleanseRate,
} from './healing';
import { SPEAR_WOUND_PULSE } from '@/lib/constants';
import type { HealingChannel, HealingPulseInput } from '@/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SIMPLE_CHANNEL: HealingChannel = {
  id: 'test',
  label: 'Test Channel',
  demand: 20,
  priority: 1.0,
  compatibility: 1.0,
  healingAccess: 10,
  barrier: 5,
  alpha: 1,
  K_W: 10,
  eta: 1.0,
};

// ── §14  computeHealingPenetration ────────────────────────────────────────────

describe('computeHealingPenetration', () => {
  it('returns 0 when healingAccess is 0', () => {
    expect(computeHealingPenetration(0, 10, 1)).toBe(0);
  });

  it('returns 0 when healingAccess is negative', () => {
    expect(computeHealingPenetration(-5, 10, 1)).toBe(0);
  });

  it('returns 0.5 when healingAccess equals barrier (alpha=1)', () => {
    expect(computeHealingPenetration(10, 10, 1)).toBeCloseTo(0.5);
  });

  it('returns >0.5 when healingAccess exceeds barrier', () => {
    expect(computeHealingPenetration(15, 10, 1)).toBeGreaterThan(0.5);
  });

  it('returns a value in [0, 1] for any positive inputs', () => {
    const cases: [number, number, number][] = [
      [1, 100, 1],
      [100, 1, 1],
      [10, 10, 2],
      [5, 5, 0.5],
    ];
    for (const [a, b, alpha] of cases) {
      const p = computeHealingPenetration(a, b, alpha);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

// ── §15  computeCompatibilityFromKappa ───────────────────────────────────────

describe('computeCompatibilityFromKappa', () => {
  it('returns exp(k_kappa * kappa) when in range', () => {
    const kappa = 0.5;
    const k = 1.0;
    expect(computeCompatibilityFromKappa(kappa, k)).toBeCloseTo(Math.exp(k * kappa));
  });

  it('clamps to 2.0 when kappa is very high', () => {
    expect(computeCompatibilityFromKappa(10, 1.0)).toBe(2.0);
  });

  it('approaches 0 but not below when kappa is very negative', () => {
    const result = computeCompatibilityFromKappa(-100, 1.0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeCloseTo(0);
  });

  it('defaults k_kappa to 1.0 when omitted', () => {
    expect(computeCompatibilityFromKappa(0.5)).toBeCloseTo(computeCompatibilityFromKappa(0.5, 1.0));
  });

  it('returns 1.0 when kappa is 0 (neutral compatibility)', () => {
    expect(computeCompatibilityFromKappa(0)).toBeCloseTo(1.0);
  });
});

// ── §16  computeAbsorption ────────────────────────────────────────────────────

describe('computeAbsorption', () => {
  it('returns 0 when demand is 0', () => {
    expect(computeAbsorption(0, 10)).toBe(0);
  });

  it('returns 0 when demand is negative', () => {
    expect(computeAbsorption(-5, 10)).toBe(0);
  });

  it('returns demand / (demand + K_W)', () => {
    expect(computeAbsorption(20, 10)).toBeCloseTo(20 / 30);
  });

  it('returns 0.5 when demand equals K_W', () => {
    expect(computeAbsorption(10, 10)).toBeCloseTo(0.5);
  });

  it('approaches 1.0 as demand greatly exceeds K_W', () => {
    expect(computeAbsorption(10000, 1)).toBeGreaterThan(0.999);
  });
});

// ── §17  computeAllocationWeights ────────────────────────────────────────────

describe('computeAllocationWeights', () => {
  it('returns priority × demand × compatibility for each channel', () => {
    const ch: HealingChannel = { ...SIMPLE_CHANNEL, priority: 2.0, demand: 5, compatibility: 1.5 };
    const weights = computeAllocationWeights([ch]);
    expect(weights[0]).toBeCloseTo(2.0 * 5 * 1.5);
  });

  it('returns an empty array for empty channel list', () => {
    expect(computeAllocationWeights([])).toEqual([]);
  });

  it('produces proportional weights when channels differ only in priority', () => {
    const highPriority = { ...SIMPLE_CHANNEL, priority: 2.0 };
    const lowPriority = { ...SIMPLE_CHANNEL, priority: 1.0 };
    const weights = computeAllocationWeights([highPriority, lowPriority]);
    expect(weights[0]).toBeCloseTo(weights[1]! * 2);
  });
});

// ── §17  computeAllocations ───────────────────────────────────────────────────

describe('computeAllocations', () => {
  it('allocations sum to 1.0 when total weight is positive', () => {
    const allocations = computeAllocations([3, 2, 1]);
    const sum = allocations.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('returns all-zeros when total weight is 0', () => {
    expect(computeAllocations([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('returns [1.0] for a single channel (all healing goes there)', () => {
    expect(computeAllocations([5])).toEqual([1]);
  });

  it('proportional: a channel with double weight gets double allocation', () => {
    const allocations = computeAllocations([6, 3]);
    expect(allocations[0]).toBeCloseTo(2 / 3);
    expect(allocations[1]).toBeCloseTo(1 / 3);
  });
});

// ── §18  computeChannelRepair ─────────────────────────────────────────────────

describe('computeChannelRepair', () => {
  it('returns the product of all six factors', () => {
    const repair = computeChannelRepair(100, 0.5, 0.8, 1.2, 0.667, 0.85);
    expect(repair).toBeCloseTo(100 * 0.5 * 0.8 * 1.2 * 0.667 * 0.85);
  });

  it('returns 0 when allocation is 0', () => {
    expect(computeChannelRepair(100, 0, 0.8, 1.0, 0.5, 1.0)).toBe(0);
  });

  it('returns 0 when penetration is 0', () => {
    expect(computeChannelRepair(100, 0.5, 0, 1.0, 0.5, 1.0)).toBe(0);
  });
});

// ── §17–18  computeHealingPulse ───────────────────────────────────────────────

describe('computeHealingPulse', () => {
  it('returns zero result for empty channel list', () => {
    const result = computeHealingPulse({ H0: 100, channels: [] });
    expect(result).toEqual({ totalWeight: 0, totalRepair: 0, channels: [] });
  });

  it('returns one ChannelResult per channel', () => {
    const input: HealingPulseInput = { H0: 100, channels: [SIMPLE_CHANNEL] };
    const result = computeHealingPulse(input);
    expect(result.channels).toHaveLength(1);
  });

  it('single channel gets allocation = 1.0 (all healing flows through it)', () => {
    const result = computeHealingPulse({ H0: 100, channels: [SIMPLE_CHANNEL] });
    expect(result.channels[0]!.allocation).toBeCloseTo(1.0);
  });

  it('totalRepair equals the sum of channel repairs', () => {
    const result = computeHealingPulse(SPEAR_WOUND_PULSE);
    const sum = result.channels.reduce((acc, ch) => acc + ch.repair, 0);
    expect(result.totalRepair).toBeCloseTo(sum);
  });

  it('totalWeight equals the sum of channel weights', () => {
    const result = computeHealingPulse(SPEAR_WOUND_PULSE);
    const weights = computeAllocationWeights(SPEAR_WOUND_PULSE.channels);
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(result.totalWeight).toBeCloseTo(sum);
  });

  it('channel allocations sum to 1.0', () => {
    const result = computeHealingPulse(SPEAR_WOUND_PULSE);
    const sum = result.channels.reduce((acc, ch) => acc + ch.allocation, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('totalRepair is 0 when H0 is 0', () => {
    const zeroH0: HealingPulseInput = { ...SPEAR_WOUND_PULSE, H0: 0 };
    expect(computeHealingPulse(zeroH0).totalRepair).toBeCloseTo(0);
  });

  it('each channel result preserves the channel id and label', () => {
    const result = computeHealingPulse(SPEAR_WOUND_PULSE);
    for (let i = 0; i < SPEAR_WOUND_PULSE.channels.length; i++) {
      expect(result.channels[i]!.id).toBe(SPEAR_WOUND_PULSE.channels[i]!.id);
      expect(result.channels[i]!.label).toBe(SPEAR_WOUND_PULSE.channels[i]!.label);
    }
  });

  it('channel repair is consistent with computeChannelRepair for its inputs', () => {
    const input: HealingPulseInput = { H0: 100, channels: [SIMPLE_CHANNEL] };
    const result = computeHealingPulse(input);
    const ch = result.channels[0]!;
    const expected = computeChannelRepair(
      100,
      ch.allocation,
      ch.penetration,
      SIMPLE_CHANNEL.compatibility,
      ch.absorption,
      SIMPLE_CHANNEL.eta,
    );
    expect(ch.repair).toBeCloseTo(expected);
  });
});

// ── §19  stepWoundField ───────────────────────────────────────────────────────

describe('stepWoundField', () => {
  it('decreases demand when repairRate exceeds damage + aggravation', () => {
    expect(stepWoundField(20, 5, 0, 0, 1)).toBeCloseTo(15);
  });

  it('increases demand when damage + aggravation exceed repair', () => {
    expect(stepWoundField(10, 1, 5, 2, 1)).toBeCloseTo(16);
  });

  it('clamps at 0 — demand never goes negative', () => {
    expect(stepWoundField(2, 10, 0, 0, 1)).toBe(0);
  });

  it('defaults damageInput, aggravation, and dt to safe defaults when omitted', () => {
    // repairRate=5, no damage or aggravation: 10 - 5 = 5
    expect(stepWoundField(10, 5)).toBeCloseTo(5);
  });

  it('scales delta by dt', () => {
    expect(stepWoundField(10, 5, 0, 0, 2)).toBeCloseTo(0); // delta = (0 - 5) * 2 = -10 → clamp(0)
    expect(stepWoundField(10, 1, 3, 0, 2)).toBeCloseTo(14); // delta = (3 - 1) * 2 = 4
  });
});

// ── §19  computeInjuryLoad ────────────────────────────────────────────────────

describe('computeInjuryLoad', () => {
  it('returns the sum of all demands', () => {
    expect(computeInjuryLoad([10, 20, 5])).toBe(35);
  });

  it('returns 0 for an empty array', () => {
    expect(computeInjuryLoad([])).toBe(0);
  });

  it('returns the single value when given one demand', () => {
    expect(computeInjuryLoad([42])).toBe(42);
  });
});

// ── §21  computeCleanseRate ───────────────────────────────────────────────────

describe('computeCleanseRate', () => {
  it('returns the product of all five factors', () => {
    const result = computeCleanseRate(10, 0.8, 1.2, 5, 0.9);
    expect(result).toBeCloseTo(10 * 0.8 * 1.2 * 5 * 0.9);
  });

  it('returns 0 when healingField is 0', () => {
    expect(computeCleanseRate(0, 0.8, 1.2, 5, 0.9)).toBe(0);
  });

  it('returns 0 when cleavagePenetration is 0', () => {
    expect(computeCleanseRate(10, 0, 1.2, 5, 0.9)).toBe(0);
  });
});
