// ─────────────────────────────────────────────────────────────────────────────
// store/characterSheetStore.ts
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CharacterSheetState, SheetAttributeKey } from '@/types/characterSheet';
import type { SpeciesKey, ClassKey, SoulLevelKey } from '@/lib/characterTemplates';

interface CharacterSheetActions {
  setName: (name: string) => void;
  setLevel: (level: number) => void;
  setSpecies: (species: SpeciesKey) => void;
  setClassName: (className: ClassKey) => void;
  setClassAcquisitionLevel: (level: number) => void;
  setSoulLevel: (level: SoulLevelKey) => void;
  setAttribute: (key: SheetAttributeKey, value: number) => void;
  setConditionMod: (key: 'HP' | 'Mana' | 'Stamina' | 'Reserve', value: number) => void;
  setCurrentResource: (key: 'HP' | 'Mana' | 'Stamina' | 'Reserve', value: number) => void;
  setCurrentXP: (xp: number) => void;
  resetToDefaults: () => void;
}

type CharacterSheetStore = CharacterSheetState & CharacterSheetActions;

// Level 1 baseline — all attributes at species minimum (5)
const DEFAULT_STATE: CharacterSheetState = {
  name: '',
  level: 1,
  species: 'Human',
  className: 'None',
  classAcquisitionLevel: 1,
  soulLevel: 'Common',
  attributes: {
    CON: 5,
    END: 5,
    STR: 5,
    AGI: 5,
    DEX: 5,
    INT: 5,
    WIS: 5,
    CHA: 5,
    Faith: 5,
    Occult: 5,
    LUCK: 5,
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
        setClassAcquisitionLevel: (level) =>
          set({ classAcquisitionLevel: Math.max(1, level) }, false, 'setClassAcquisitionLevel'),
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
      }),
      {
        name: 'dominion-realm-character-sheet',
        // currentResources is transient — not persisted
        partialize: (state) => ({
          name: state.name,
          level: state.level,
          species: state.species,
          className: state.className,
          classAcquisitionLevel: state.classAcquisitionLevel,
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
