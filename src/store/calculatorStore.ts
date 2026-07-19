// ─────────────────────────────────────────────────────────────────────────────
// store/calculatorStore.ts
// Single Zustand store for all mutable calculator state.
// Derived/computed values live in hooks/useCalculator.ts, not here.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Attributes,
  AttributeKey,
  CurrentResources,
  ResourceKey,
  RegenCurveParams,
  HealingChannel,
  ConditionInput,
  CalculatorState,
} from '@/types';
import {
  DEFAULT_ATTRIBUTES,
  DEFAULT_REGEN_CURVE_PARAMS,
  SOUL_LEVEL_MOD_DEFAULT,
  RECOVERY_STATE_MOD_DEFAULT,
  SPEAR_WOUND_PULSE,
} from '@/lib/constants';
import { computeCalculatorResources } from '@/lib/formulas';

// ────────────────────────────────────────────────
// Store interface
// ────────────────────────────────────────────────

interface CalculatorActions {
  // Attribute mutations
  setAttribute: (key: AttributeKey, value: number) => void;
  setAllAttributes: (attrs: Attributes) => void;
  resetAttributes: () => void;

  // Current resource mutations
  setCurrentResource: (key: ResourceKey, value: number) => void;
  resetCurrentResources: () => void;

  // Modifier mutations
  setSoulLevelMod: (value: number) => void;
  setRecoveryStateMod: (value: number) => void;

  // Regen curve param mutations
  setRegenCurveParam: <K extends keyof RegenCurveParams>(
    key: K,
    value: RegenCurveParams[K],
  ) => void;
  resetRegenCurveParams: () => void;

  // Healing pulse mutations
  setHealingH0: (value: number) => void;
  updateHealingChannel: (index: number, updates: Partial<HealingChannel>) => void;
  addHealingChannel: (channel: HealingChannel) => void;
  removeHealingChannel: (index: number) => void;
  resetHealingPulse: () => void;

  // Condition input mutations
  setConditionInput: (index: number, input: ConditionInput) => void;
  addConditionInput: () => void;
  removeConditionInput: (index: number) => void;
}

export type CalculatorStore = CalculatorState & CalculatorActions;

// ────────────────────────────────────────────────
// Initial state
// ────────────────────────────────────────────────

function makeDefaultCurrentResources(attrs: Attributes): CurrentResources {
  const maxima = computeCalculatorResources(attrs, SOUL_LEVEL_MOD_DEFAULT);
  // Start at 75% of max for a more interesting default calculator state
  return {
    HP: Math.floor(maxima.HP * 0.75),
    Mana: Math.floor(maxima.Mana * 0.75),
    Stamina: Math.floor(maxima.Stamina * 0.75),
    Reserve: Math.floor(maxima.Reserve * 0.75),
  };
}

const DEFAULT_CONDITION_INPUTS: ConditionInput[] = [
  { load: 12, resistance: 10, thresholdWidth: 5 }, // minor poison example
];

// ────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────

export const useCalculatorStore = create<CalculatorStore>()(
  devtools(
    (set) => ({
      // ── State ──
      attributes: { ...DEFAULT_ATTRIBUTES },
      currentResources: makeDefaultCurrentResources(DEFAULT_ATTRIBUTES),
      soulLevelMod: SOUL_LEVEL_MOD_DEFAULT,
      recoveryStateMod: RECOVERY_STATE_MOD_DEFAULT,
      regenCurveParams: { ...DEFAULT_REGEN_CURVE_PARAMS },
      healingPulse: structuredClone(SPEAR_WOUND_PULSE),
      conditionInputs: [...DEFAULT_CONDITION_INPUTS],

      // ── Attribute actions ──
      setAttribute: (key, value) =>
        set(
          (state) => ({ attributes: { ...state.attributes, [key]: value } }),
          false,
          `setAttribute/${key}`,
        ),

      setAllAttributes: (attrs) => set({ attributes: { ...attrs } }, false, 'setAllAttributes'),

      resetAttributes: () =>
        set({ attributes: { ...DEFAULT_ATTRIBUTES } }, false, 'resetAttributes'),

      // ── Current resource actions ──
      setCurrentResource: (key, value) =>
        set(
          (state) => ({ currentResources: { ...state.currentResources, [key]: value } }),
          false,
          `setCurrentResource/${key}`,
        ),

      resetCurrentResources: () =>
        set(
          (state) => ({
            currentResources: makeDefaultCurrentResources(state.attributes),
          }),
          false,
          'resetCurrentResources',
        ),

      // ── Modifier actions ──
      setSoulLevelMod: (value) => set({ soulLevelMod: value }, false, 'setSoulLevelMod'),

      setRecoveryStateMod: (value) =>
        set({ recoveryStateMod: value }, false, 'setRecoveryStateMod'),

      // ── Regen curve params ──
      setRegenCurveParam: (key, value) =>
        set(
          (state) => ({ regenCurveParams: { ...state.regenCurveParams, [key]: value } }),
          false,
          `setRegenCurveParam/${key}`,
        ),

      resetRegenCurveParams: () =>
        set(
          { regenCurveParams: { ...DEFAULT_REGEN_CURVE_PARAMS } },
          false,
          'resetRegenCurveParams',
        ),

      // ── Healing pulse actions ──
      setHealingH0: (value) =>
        set(
          (state) => ({ healingPulse: { ...state.healingPulse, H0: value } }),
          false,
          'setHealingH0',
        ),

      updateHealingChannel: (index, updates) =>
        set(
          (state) => {
            const channels = [...state.healingPulse.channels];
            const existing = channels[index];
            if (!existing) return state;
            channels[index] = { ...existing, ...updates };
            return { healingPulse: { ...state.healingPulse, channels } };
          },
          false,
          `updateHealingChannel/${index}`,
        ),

      addHealingChannel: (channel) =>
        set(
          (state) => ({
            healingPulse: {
              ...state.healingPulse,
              channels: [...state.healingPulse.channels, channel],
            },
          }),
          false,
          'addHealingChannel',
        ),

      removeHealingChannel: (index) =>
        set(
          (state) => ({
            healingPulse: {
              ...state.healingPulse,
              channels: state.healingPulse.channels.filter((_, i) => i !== index),
            },
          }),
          false,
          `removeHealingChannel/${index}`,
        ),

      resetHealingPulse: () =>
        set({ healingPulse: structuredClone(SPEAR_WOUND_PULSE) }, false, 'resetHealingPulse'),

      // ── Condition input actions ──
      setConditionInput: (index, input) =>
        set(
          (state) => {
            const conditionInputs = [...state.conditionInputs];
            conditionInputs[index] = input;
            return { conditionInputs };
          },
          false,
          `setConditionInput/${index}`,
        ),

      addConditionInput: () =>
        set(
          (state) => ({
            conditionInputs: [
              ...state.conditionInputs,
              { load: 0, resistance: 10, thresholdWidth: 5 },
            ],
          }),
          false,
          'addConditionInput',
        ),

      removeConditionInput: (index) =>
        set(
          (state) => ({
            conditionInputs: state.conditionInputs.filter((_, i) => i !== index),
          }),
          false,
          `removeConditionInput/${index}`,
        ),
    }),
    { name: 'DominionRealmCalculator' },
  ),
);
