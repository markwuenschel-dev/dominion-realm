// ─────────────────────────────────────────────────────────────────────────────
// types/characterSheet.ts
// Types specific to the stat sheet — extends core Attributes with LUCK.
// LUCK has no resource-formula effect; it's tracked but not converted to a number.
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes } from '@/types';
import type { SpeciesKey, SoulLevelKey } from '@/lib/characterTemplates';
import type { ClassKey } from '@/lib/classTaxonomy';

// ────────────────────────────────────────────────
// Extended attribute set (adds LUCK)
// ────────────────────────────────────────────────

export interface CharacterSheetAttributes extends Attributes {
  /**
   * Per luck_fortune.md: Luck is a cross-system probability-flow mechanic, not a
   * resource weight. Never converted to a numeric resource/combat bonus here.
   */
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
  'CVN',
  'MYS',
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
  { label: 'Soul', keys: ['CVN', 'MYS'] },
  { label: 'Fortune', keys: ['LUCK'], note: 'No resource-formula effect' },
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
  'CVN',
  'MYS',
] as const satisfies (keyof Attributes)[];

// ────────────────────────────────────────────────
// Full stat sheet state
// ────────────────────────────────────────────────

export interface CharacterSheetState {
  name: string;
  level: number;
  species: SpeciesKey;
  className: ClassKey;
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
  /** Attribute-derived maximum with per-attribute class multipliers already baked in. */
  attributeValue: number;
  raceMod: number;
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
  totalPointsAvailable: number;
  spentPoints: number;
  remainingPoints: number;
  /** null for Unique-tier classes — progression scale is undefined (N_cycle). */
  xpToNextLevel: number | null;
  /** null when xpToNextLevel is null. */
  xpProgressPercent: number | null;
  regenRates: RegenRates;
}
