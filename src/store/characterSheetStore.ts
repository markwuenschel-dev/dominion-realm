// ─────────────────────────────────────────────────────────────────────────────
// store/characterSheetStore.ts
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CharacterSheetState, SheetAttributeKey } from '@/types/characterSheet';
import { ATTRIBUTE_BASELINE } from '@/lib/formulas/pointBudget';
import type { SpeciesKey, SoulLevelKey } from '@/lib/characterTemplates';
import type { ClassKey } from '@/lib/classTaxonomy';

interface CharacterSheetActions {
  setName: (name: string) => void;
  setLevel: (level: number) => void;
  setSpecies: (species: SpeciesKey) => void;
  setClassName: (className: ClassKey) => void;
  setSoulLevel: (level: SoulLevelKey) => void;
  setAttribute: (key: SheetAttributeKey, value: number) => void;
  setConditionMod: (key: 'HP' | 'Mana' | 'Stamina' | 'Reserve', value: number) => void;
  setCurrentResource: (key: 'HP' | 'Mana' | 'Stamina' | 'Reserve', value: number) => void;
  setCurrentXP: (xp: number) => void;
  resetToDefaults: () => void;
  /** Replace the full sheet state — used by profile loader and JSON import. */
  loadState: (partial: Partial<CharacterSheetState>) => void;
}

type CharacterSheetStore = CharacterSheetState & CharacterSheetActions;

// Level 1 baseline — every attribute starts at the all-5s point-buy baseline.
const DEFAULT_STATE: CharacterSheetState = {
  name: '',
  level: 1,
  species: 'Human',
  className: 'None',
  soulLevel: 'Common',
  attributes: {
    CON: ATTRIBUTE_BASELINE,
    END: ATTRIBUTE_BASELINE,
    STR: ATTRIBUTE_BASELINE,
    AGI: ATTRIBUTE_BASELINE,
    DEX: ATTRIBUTE_BASELINE,
    INT: ATTRIBUTE_BASELINE,
    WIS: ATTRIBUTE_BASELINE,
    CHA: ATTRIBUTE_BASELINE,
    CVN: ATTRIBUTE_BASELINE,
    MYS: ATTRIBUTE_BASELINE,
    LUCK: ATTRIBUTE_BASELINE,
  },
  conditionMods: { HP: 1.0, Mana: 1.0, Stamina: 1.0, Reserve: 1.0 },
  currentResources: { HP: 50, Mana: 50, Stamina: 50, Reserve: 40 },
  currentXP: 0,
};

export const useCharacterSheetStore = create<CharacterSheetStore>()(
  devtools(
    persist(
      (set) => ({
        ...DEFAULT_STATE,

        setName: (name) => set({ name }, false, 'setName'),
        setLevel: (level) => set({ level: Math.max(1, Math.min(50, level)) }, false, 'setLevel'),
        setSpecies: (species) => set({ species }, false, 'setSpecies'),
        setClassName: (className) => set({ className }, false, 'setClassName'),
        setSoulLevel: (soulLevel) => set({ soulLevel }, false, 'setSoulLevel'),

        setAttribute: (key, value) =>
          set(
            (state) => ({
              attributes: { ...state.attributes, [key]: Math.max(1, Math.min(30, value)) },
            }),
            false,
            `setAttribute/${key}`,
          ),

        setConditionMod: (key, value) =>
          set(
            (state) => ({ conditionMods: { ...state.conditionMods, [key]: value } }),
            false,
            `setConditionMod/${key}`,
          ),

        setCurrentResource: (key, value) =>
          set(
            (state) => ({
              currentResources: { ...state.currentResources, [key]: Math.max(0, value) },
            }),
            false,
            `setCurrentResource/${key}`,
          ),

        setCurrentXP: (currentXP) =>
          set({ currentXP: Math.max(0, currentXP) }, false, 'setCurrentXP'),

        resetToDefaults: () => set({ ...DEFAULT_STATE }, false, 'resetToDefaults'),

        loadState: (partial) =>
          set(
            {
              ...DEFAULT_STATE,
              ...partial,
              conditionMods: partial.conditionMods ?? DEFAULT_STATE.conditionMods,
            },
            false,
            'loadState',
          ),
      }),
      {
        name: 'dominion-realm-character-sheet',
        version: 3, // bumped for Faith→CVN/Occult→MYS rename + classAcquisitionLevel removal
        // currentResources is transient — not persisted
        partialize: (state) => ({
          name: state.name,
          level: state.level,
          species: state.species,
          className: state.className,
          soulLevel: state.soulLevel,
          attributes: state.attributes,
          conditionMods: state.conditionMods,
          currentXP: state.currentXP,
        }),
      },
    ),
    { name: 'CharacterSheet' },
  ),
);
