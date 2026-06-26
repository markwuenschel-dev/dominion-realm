// ─────────────────────────────────────────────────────────────────────────────
// types/characterSheet.ts
// Types specific to the stat sheet — extends core Attributes with LUCK.
// LUCK has no formula effect in the current lock; it's tracked but not computed.
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes } from '@/types';
import type { SpeciesKey, ClassKey, SoulLevelKey } from '@/lib/characterTemplates';

// ────────────────────────────────────────────────
// Extended attribute set (adds LUCK)
// ────────────────────────────────────────────────

export interface CharacterSheetAttributes extends Attributes {
  /** No resource formula effect in current lock. Tracked for completeness. */
  LUCK: number;
}

export const SHEET_ATTRIBUTE_KEYS = [
  'CON',
  'END',
  'STR',
  'AGI',
  'DEX',
  'INT',
  'WIS',
  'CHA',
  'Faith',
  'Occult',
  'LUCK',
] as const satisfies (keyof CharacterSheetAttributes)[];

export type SheetAttributeKey = (typeof SHEET_ATTRIBUTE_KEYS)[number];

/** Grouped for the attribute panel layout */
export const SHEET_ATTRIBUTE_GROUPS: {
  label: string;
  keys: SheetAttributeKey[];
  note?: string;
}[] = [
  { label: 'Physical', keys: ['CON', 'END', 'STR', 'AGI', 'DEX'] },
  { label: 'Mental', keys: ['INT', 'WIS', 'CHA'] },
  { label: 'Soul', keys: ['Faith', 'Occult'] },
  { label: 'Fortune', keys: ['LUCK'], note: 'No formula effect in current lock' },
];

/** Attributes that feed into resource formulas (excludes LUCK) */
export const FORMULA_ATTRIBUTE_KEYS = [
  'CON',
  'END',
  'STR',
  'AGI',
  'DEX',
  'INT',
  'WIS',
  'CHA',
  'Faith',
  'Occult',
] as const satisfies (keyof Attributes)[];

// ────────────────────────────────────────────────
// Full stat sheet state
// ────────────────────────────────────────────────

export interface CharacterSheetState {
  name: string;
  level: number;
  species: SpeciesKey;
  className: ClassKey;
  classAcquisitionLevel: number;
  soulLevel: SoulLevelKey;
  attributes: CharacterSheetAttributes;
  conditionMods: { HP: number; Mana: number; Stamina: number; Reserve: number };
  currentResources: { HP: number; Mana: number; Stamina: number; Reserve: number };
  currentXP: number;
}

// ────────────────────────────────────────────────
// Derived values returned by useCharacterSheet
// ────────────────────────────────────────────────

export interface FinalResources {
  HP: number;
  Mana: number;
  Stamina: number;
  Reserve: number;
}

export interface ResourceBreakdown {
  resource: 'HP' | 'Mana' | 'Stamina' | 'Reserve';
  attributeValue: number;
  raceMod: number;
  classMod: number;
  soulMultiplier: number;
  conditionMod: number;
  final: number;
}

export interface RegenRates {
  HP: {
    safeRest: number;
    lightRest: number;
    activeTravel: number;
    combat: 0;
  };
  Mana: {
    meditation: number;
    calmNoncombat: number;
    activeTravel: number;
    combat: number;
  };
  Stamina: {
    fullRest: number;
    catchingBreath: number;
    lightMovement: number;
    combat: number;
  };
  Reserve: {
    deepSleep: number;
    meditation: number;
    ordinaryRest: number;
    activeTravel: number;
    combat: 0;
  };
}

export interface CharacterSheetDerived {
  breakdowns: ResourceBreakdown[];
  finalResources: FinalResources;
  totalFreePoints: number;
  classBonusPoints: number;
  totalPointsAvailable: number;
  spentPoints: number;
  remainingPoints: number;
  xpToNextLevel: number;
  xpProgressPercent: number;
  regenRates: RegenRates;
}
