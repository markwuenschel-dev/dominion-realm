// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCalculator.ts
// Derived calculator state — reads from the store, runs formula functions.
// Components should import computed values from here, not recompute them.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import {
  computeResourceMaxima,
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
import type {
  ResourceMaxima,
  ResourceRatios,
  BaseRegen,
  RegenResult,
  HealingPulseResult,
  ConditionResult,
} from '@/types';
import type { CurveSample } from '@/lib/formulas/regeneration';

// ────────────────────────────────────────────────
// Return type
// ────────────────────────────────────────────────

export interface CalculatorDerived {
  // §1  Resource maxima
  maxima: ResourceMaxima;

  // §2  q ratios
  ratios: ResourceRatios;

  // §3  Base regen
  baseRegen: BaseRegen;

  // §4/5  Full regen results (with curve multiplier applied)
  regenResults: RegenResult[];

  // §4  Regen curve samples (for SVG visualization)
  curveSamples: CurveSample[];

  // §11  Derived resistance values from current attributes
  derivedResistances: {
    Poison: number;
    Stagger: number;
    ManaCrash: number;
  };

  // §12–18  Healing pulse result
  healingResult: HealingPulseResult;

  // §9–11  Condition severity results
  conditionResults: ConditionResult[];
}

// ────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────

export function useCalculator(): CalculatorDerived {
  const {
    attributes,
    currentResources,
    soulLevelMod,
    recoveryStateMod,
    regenCurveParams,
    healingPulse,
    conditionInputs,
  } = useCalculatorStore();

  // §1  Resource maxima
  const maxima = useMemo(
    () => computeResourceMaxima(attributes, soulLevelMod),
    [attributes, soulLevelMod],
  );

  // §2  q ratios
  const ratios = useMemo(
    () => computeAllRatios(currentResources, maxima),
    [currentResources, maxima],
  );

  // §3  Base regen
  const baseRegen = useMemo(() => computeBaseRegen(attributes), [attributes]);

  // §4/5  Full regen results
  const regenResults = useMemo(
    () => computeAllRegenResults(attributes, ratios, recoveryStateMod, regenCurveParams),
    [attributes, ratios, recoveryStateMod, regenCurveParams],
  );

  // §4  Regen curve samples (200 points for smooth SVG path)
  const curveSamples = useMemo(() => sampleRegenCurve(regenCurveParams, 200), [regenCurveParams]);

  // §11  Derived resistances
  const derivedResistances = useMemo(
    () => ({
      Poison: computePoisonResistance(attributes),
      Stagger: computeStaggerResistance(attributes),
      ManaCrash: computeManaCrashResistance(attributes),
    }),
    [attributes],
  );

  // §12–18  Healing pulse
  const healingResult = useMemo(() => computeHealingPulse(healingPulse), [healingPulse]);

  // §9–11  Condition severities
  const conditionResults = useMemo(
    () => conditionInputs.map((input) => computeSeverity(input)),
    [conditionInputs],
  );

  return {
    maxima,
    ratios,
    baseRegen,
    regenResults,
    curveSamples,
    derivedResistances,
    healingResult,
    conditionResults,
  };
}

// ────────────────────────────────────────────────
// Convenience selector hooks (avoid re-renders for components
// that only care about one slice of derived state)
// ────────────────────────────────────────────────

export function useResourceMaxima(): ResourceMaxima {
  const { attributes, soulLevelMod } = useCalculatorStore();
  return useMemo(() => computeResourceMaxima(attributes, soulLevelMod), [attributes, soulLevelMod]);
}

export function useBaseRegen(): BaseRegen {
  const attributes = useCalculatorStore((s) => s.attributes);
  return useMemo(() => computeBaseRegen(attributes), [attributes]);
}

export function useRegenCurveSamples(): CurveSample[] {
  const regenCurveParams = useCalculatorStore((s) => s.regenCurveParams);
  return useMemo(() => sampleRegenCurve(regenCurveParams, 200), [regenCurveParams]);
}
