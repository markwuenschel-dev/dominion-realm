// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCalculator.test.tsx
// The calculator's derived-state seam. Two guards:
//   1. Each slice hook wires the right formula to the right store fields — its
//      output equals the pure function applied to current store state.
//   2. Isolation — a slice hook re-renders only when ITS inputs change, not on
//      any store mutation (the whole point of narrowing the old god hook).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useResourceMaxima,
  useResourceRatios,
  useBaseRegen,
  useRegenResults,
  useRegenCurveSamples,
  useDerivedResistances,
  useHealingResult,
  useConditionResults,
} from './useCalculator';
import { useCalculatorStore } from '@/store/calculatorStore';
import {
  computeCalculatorResources,
  computeAllRatios,
  computeBaseRegen,
  computeAllRegenResults,
  computeHealingPulse,
  computeSeverity,
  computePoisonResistance,
  computeStaggerResistance,
  computeManaCrashResistance,
  sampleRegenCurve,
} from '@/lib/formulas';

afterEach(() => {
  useCalculatorStore.getState().resetAttributes();
});

describe('useCalculator slice hooks — each wires the right formula to the right store fields', () => {
  it('useResourceMaxima = computeCalculatorResources(attributes, soulLevelMod)', () => {
    const { result } = renderHook(() => useResourceMaxima());
    const s = useCalculatorStore.getState();
    expect(result.current).toEqual(computeCalculatorResources(s.attributes, s.soulLevelMod));
  });

  it('useResourceRatios = computeAllRatios(currentResources, maxima)', () => {
    const { result } = renderHook(() => useResourceRatios());
    const s = useCalculatorStore.getState();
    const maxima = computeCalculatorResources(s.attributes, s.soulLevelMod);
    expect(result.current).toEqual(computeAllRatios(s.currentResources, maxima));
  });

  it('useBaseRegen = computeBaseRegen(attributes)', () => {
    const { result } = renderHook(() => useBaseRegen());
    expect(result.current).toEqual(computeBaseRegen(useCalculatorStore.getState().attributes));
  });

  it('useRegenResults = computeAllRegenResults(attributes, ratios, recoveryStateMod, params)', () => {
    const { result } = renderHook(() => useRegenResults());
    const s = useCalculatorStore.getState();
    const maxima = computeCalculatorResources(s.attributes, s.soulLevelMod);
    const ratios = computeAllRatios(s.currentResources, maxima);
    expect(result.current).toEqual(
      computeAllRegenResults(s.attributes, ratios, s.recoveryStateMod, s.regenCurveParams),
    );
  });

  it('useRegenCurveSamples = sampleRegenCurve(params, 200)', () => {
    const { result } = renderHook(() => useRegenCurveSamples());
    expect(result.current).toEqual(
      sampleRegenCurve(useCalculatorStore.getState().regenCurveParams, 200),
    );
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('useDerivedResistances = the three §11 resistance formulas', () => {
    const { result } = renderHook(() => useDerivedResistances());
    const a = useCalculatorStore.getState().attributes;
    expect(result.current).toEqual({
      Poison: computePoisonResistance(a),
      Stagger: computeStaggerResistance(a),
      ManaCrash: computeManaCrashResistance(a),
    });
  });

  it('useHealingResult = computeHealingPulse(healingPulse)', () => {
    const { result } = renderHook(() => useHealingResult());
    expect(result.current).toEqual(computeHealingPulse(useCalculatorStore.getState().healingPulse));
  });

  it('useConditionResults = conditionInputs.map(computeSeverity)', () => {
    const { result } = renderHook(() => useConditionResults());
    expect(result.current).toEqual(
      useCalculatorStore.getState().conditionInputs.map((i) => computeSeverity(i)),
    );
  });
});

describe('useCalculator slice hooks — isolation (the deepening payoff)', () => {
  it('useHealingResult does NOT re-render when an unrelated field (attributes) changes', () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useHealingResult();
    });
    const before = renders;

    act(() => {
      // Bump an attribute — healing depends only on healingPulse, so this hook
      // must not re-render. Under the old god hook it would have.
      const cur = useCalculatorStore.getState().attributes.CON;
      useCalculatorStore.getState().setAttribute('CON', cur + 5);
    });

    expect(renders).toBe(before);
  });

  it('useRegenResults DOES recompute when attributes change (still correctly wired)', () => {
    const { result } = renderHook(() => useRegenResults());
    const first = result.current;

    act(() => {
      const cur = useCalculatorStore.getState().attributes.END;
      useCalculatorStore.getState().setAttribute('END', cur + 5);
    });

    const s = useCalculatorStore.getState();
    const maxima = computeCalculatorResources(s.attributes, s.soulLevelMod);
    const ratios = computeAllRatios(s.currentResources, maxima);
    expect(result.current).toEqual(
      computeAllRegenResults(s.attributes, ratios, s.recoveryStateMod, s.regenCurveParams),
    );
    expect(result.current).not.toBe(first);
  });
});
