// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCalculator.ts
// Derived calculator state as NARROW per-slice selector hooks. Each hook reads
// only the store fields its slice depends on, so a component re-renders only when
// its own inputs change. The maxima → ratios → regenResults dependency chain is
// hidden inside composition (hooks calling hooks), never re-exposed as one bundle.
//
// Components import the single slice they need — not a wide "everything" object.
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

/** Derived resistances slice shape. */
export interface DerivedResistances {
  Poison: number;
  Stagger: number;
  ManaCrash: number;
}

// ────────────────────────────────────────────────
// Leaf hooks — subscribe directly to store fields, no derived dependencies
// ────────────────────────────────────────────────

/** §1 resource maxima. Subscribes: attributes, soulLevelMod. */
export function useResourceMaxima(): ResourceMaxima {
  const attributes = useCalculatorStore((s) => s.attributes);
  const soulLevelMod = useCalculatorStore((s) => s.soulLevelMod);
  return useMemo(() => computeResourceMaxima(attributes, soulLevelMod), [attributes, soulLevelMod]);
}

/** §3 base regen. Subscribes: attributes. */
export function useBaseRegen(): BaseRegen {
  const attributes = useCalculatorStore((s) => s.attributes);
  return useMemo(() => computeBaseRegen(attributes), [attributes]);
}

/** §4 regen-curve samples for the SVG viz (200 points). Subscribes: regenCurveParams. */
export function useRegenCurveSamples(): CurveSample[] {
  const regenCurveParams = useCalculatorStore((s) => s.regenCurveParams);
  return useMemo(() => sampleRegenCurve(regenCurveParams, 200), [regenCurveParams]);
}

/** §11 derived resistances. Subscribes: attributes. */
export function useDerivedResistances(): DerivedResistances {
  const attributes = useCalculatorStore((s) => s.attributes);
  return useMemo(
    () => ({
      Poison: computePoisonResistance(attributes),
      Stagger: computeStaggerResistance(attributes),
      ManaCrash: computeManaCrashResistance(attributes),
    }),
    [attributes],
  );
}

/** §12–22 healing pulse. Subscribes: healingPulse. */
export function useHealingResult(): HealingPulseResult {
  const healingPulse = useCalculatorStore((s) => s.healingPulse);
  return useMemo(() => computeHealingPulse(healingPulse), [healingPulse]);
}

/** §9–11 condition severities. Subscribes: conditionInputs. */
export function useConditionResults(): ConditionResult[] {
  const conditionInputs = useCalculatorStore((s) => s.conditionInputs);
  return useMemo(() => conditionInputs.map((input) => computeSeverity(input)), [conditionInputs]);
}

// ────────────────────────────────────────────────
// Composed hooks — call a narrower hook + subscribe to the extra fields the
// dependency chain needs. The chain stays hidden behind the interface.
// ────────────────────────────────────────────────

/** §2 q ratios. Depends on maxima; additionally subscribes: currentResources. */
export function useResourceRatios(): ResourceRatios {
  const maxima = useResourceMaxima();
  const currentResources = useCalculatorStore((s) => s.currentResources);
  return useMemo(() => computeAllRatios(currentResources, maxima), [currentResources, maxima]);
}

/** §4/5 full regen results. Depends on ratios; adds: attributes, recoveryStateMod, regenCurveParams. */
export function useRegenResults(): RegenResult[] {
  const ratios = useResourceRatios();
  const attributes = useCalculatorStore((s) => s.attributes);
  const recoveryStateMod = useCalculatorStore((s) => s.recoveryStateMod);
  const regenCurveParams = useCalculatorStore((s) => s.regenCurveParams);
  return useMemo(
    () => computeAllRegenResults(attributes, ratios, recoveryStateMod, regenCurveParams),
    [attributes, ratios, recoveryStateMod, regenCurveParams],
  );
}
