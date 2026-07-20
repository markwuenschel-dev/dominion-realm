// ─────────────────────────────────────────────────────────────────────────────
// lib/characterTemplates.ts
// Canonical multipliers mirroring the formula lock in `src/lib/formulas`
// (`resources.ts` owns the resource-maxima formula; these tables reproduce it).
// The lock — the code, not any doc — is the source of truth. All species/class
// multipliers are pinned to baseline human all-5s (HP=50, Mana=50, Stamina=50,
// Reserve=40).
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Key types
// ────────────────────────────────────────────────

export type SpeciesKey =
  | 'Human'
  | 'Elf'
  | 'Dwarf'
  | 'Orc'
  | 'Wolf'
  | 'GiantSpider'
  | 'UndeadHumanoid'
  | 'DemonPlaceholder'
  | 'XylorynDrone';

// Class taxonomy (keys, rarity, profiles, attribute multipliers) lives in
// lib/classTaxonomy.ts. Species, soul level, and depletion bands stay here.

export type SoulLevelKey =
  | 'Fractured'
  | 'Faint'
  | 'Weak'
  | 'Lesser'
  | 'Common'
  | 'Strong'
  | 'Luminous'
  | 'Radiant'
  | 'Brilliant'
  | 'Resplendent'
  | 'Exalted'
  | 'Transcendent'
  | 'Divine'
  | 'Absolute';

export interface ResourceMods {
  HP: number;
  Mana: number;
  Stamina: number;
  Reserve: number;
}

// ────────────────────────────────────────────────
// §6  Soul Level Ladder
// ────────────────────────────────────────────────

export interface SoulLevelEntry {
  key: SoulLevelKey;
  label: string;
  multiplier: number;
}

export const SOUL_LEVELS: SoulLevelEntry[] = [
  { key: 'Fractured', label: 'Fractured', multiplier: 0.9 },
  { key: 'Faint', label: 'Faint', multiplier: 0.94 },
  { key: 'Weak', label: 'Weak', multiplier: 0.96 },
  { key: 'Lesser', label: 'Lesser', multiplier: 0.98 },
  { key: 'Common', label: 'Common', multiplier: 1.0 },
  { key: 'Strong', label: 'Strong', multiplier: 1.04 },
  { key: 'Luminous', label: 'Luminous', multiplier: 1.07 },
  { key: 'Radiant', label: 'Radiant', multiplier: 1.1 },
  { key: 'Brilliant', label: 'Brilliant', multiplier: 1.13 },
  { key: 'Resplendent', label: 'Resplendent', multiplier: 1.16 },
  { key: 'Exalted', label: 'Exalted', multiplier: 1.19 },
  { key: 'Transcendent', label: 'Transcendent', multiplier: 1.22 },
  { key: 'Divine', label: 'Divine', multiplier: 1.25 },
  { key: 'Absolute', label: 'Absolute', multiplier: 1.3 },
];

export const DEFAULT_SOUL_LEVEL: SoulLevelKey = 'Common';

// ────────────────────────────────────────────────
// §18  Species Templates
// RaceMod derived: SpeciesValue / HumanBaseline
//   HP baseline=50, Mana baseline=50,
//   Stamina baseline=50, Reserve baseline=40
// ────────────────────────────────────────────────

export interface SpeciesTemplate {
  key: SpeciesKey;
  label: string;
  raceMod: ResourceMods;
  pointsPerLevel: number;
  description: string;
}

export const SPECIES_TEMPLATES: Record<SpeciesKey, SpeciesTemplate> = {
  Human: {
    key: 'Human',
    label: 'Human',
    raceMod: { HP: 1.0, Mana: 1.0, Stamina: 1.0, Reserve: 1.0 },
    pointsPerLevel: 4,
    description: '4 fully free points/level. No forced growth. Widest allocation freedom.',
  },
  Elf: {
    key: 'Elf',
    label: 'Elf',
    raceMod: { HP: 0.8, Mana: 1.12, Stamina: 1.08, Reserve: 1.0 },
    pointsPerLevel: 5,
    description: 'Fragile HP, strong Mana and Stamina. Often partially forced INT/AGI.',
  },
  Dwarf: {
    key: 'Dwarf',
    label: 'Dwarf',
    raceMod: { HP: 1.5, Mana: 0.94, Stamina: 1.4, Reserve: 1.25 },
    pointsPerLevel: 5,
    description: 'High physical resilience, lower mana ceiling. Forced CON/STR/END.',
  },
  Orc: {
    key: 'Orc',
    label: 'Orc',
    raceMod: { HP: 1.56, Mana: 0.74, Stamina: 1.32, Reserve: 1.15 },
    pointsPerLevel: 5,
    description: 'Strongest raw physical output. Very low mana ceiling. Forced STR/END.',
  },
  Wolf: {
    key: 'Wolf',
    label: 'Wolf',
    raceMod: { HP: 1.0, Mana: 0.32, Stamina: 1.32, Reserve: 1.05 },
    pointsPerLevel: 4,
    description: 'Strong Stamina, minimal Mana. Non-sapient species template.',
  },
  GiantSpider: {
    key: 'GiantSpider',
    label: 'Giant Spider',
    raceMod: { HP: 0.92, Mana: 0.4, Stamina: 1.18, Reserve: 1.025 },
    pointsPerLevel: 4,
    description: 'Moderately durable, low-medium Mana. Non-sapient template.',
  },
  UndeadHumanoid: {
    key: 'UndeadHumanoid',
    label: 'Undead Humanoid',
    raceMod: { HP: 1.42, Mana: 0.54, Stamina: 0.96, Reserve: 1.375 },
    pointsPerLevel: 4,
    description: 'High HP and Reserve, low Mana, slightly reduced Stamina.',
  },
  DemonPlaceholder: {
    key: 'DemonPlaceholder',
    label: 'Demon (Placeholder)',
    raceMod: { HP: 2.4, Mana: 0.8, Stamina: 1.84, Reserve: 1.8 },
    pointsPerLevel: 6,
    description: '⚠ Not canon. Do not assign to the Eyes-giving entity without author decision.',
  },
  XylorynDrone: {
    key: 'XylorynDrone',
    label: 'Xyloryn Drone',
    raceMod: { HP: 1.5, Mana: 0.42, Stamina: 1.5, Reserve: 1.325 },
    pointsPerLevel: 6,
    description: 'Drone baseline only. Book 1 finale threat is a Myrmidon, not a drone.',
  },
};

// Soul-level text colours (SOUL_LEVEL_TEXT_COLORS) live in lib/palette.ts.
