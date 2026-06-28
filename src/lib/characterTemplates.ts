// ─────────────────────────────────────────────────────────────────────────────
// lib/characterTemplates.ts
// Canonical data from resource_system.md §§4–19.
// Where resource_system.md conflicts with the formula lock doc, the lock wins.
// All species/class multipliers are derived from §18/§19 tables at baseline
// human all-5s (HP=50, Mana=50, Stamina=50, Reserve=40).
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

export type ClassKey =
  | 'None'
  | 'Warrior'
  | 'Mage'
  | 'Rogue'
  | 'Scout'
  | 'Healer'
  | 'Warden'
  | 'Psion'
  | 'Adventurer';

export type ClassRarity =
  | 'Unclassed'
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Exceptional'
  | 'Legendary'
  | 'Mythic'
  | 'Unique';

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

export function getSoulMultiplier(key: SoulLevelKey): number {
  return SOUL_LEVELS.find((s) => s.key === key)?.multiplier ?? 1.0;
}

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

// ────────────────────────────────────────────────
// §19  Class Templates
// ClassMod derived: ClassValue / HumanBaseline (same all-5s baseline)
// ────────────────────────────────────────────────

export interface ClassTemplate {
  key: ClassKey;
  label: string;
  rarity: ClassRarity;
  classMod: ResourceMods;
  bonusPointCadence: number; // levels per bonus point (0 = none)
  primaryShape: string;
}

export const CLASS_TEMPLATES: Record<ClassKey, ClassTemplate> = {
  None: {
    key: 'None',
    label: 'Unclassed',
    rarity: 'Unclassed',
    classMod: { HP: 1.0, Mana: 1.0, Stamina: 1.0, Reserve: 1.0 },
    bonusPointCadence: 0,
    primaryShape: 'No class modifier',
  },
  Warrior: {
    key: 'Warrior',
    label: 'Warrior',
    rarity: 'Common',
    classMod: { HP: 1.1, Mana: 0.96, Stamina: 1.1, Reserve: 1.05 },
    bonusPointCadence: 5,
    primaryShape: 'Direct combat durability',
  },
  Mage: {
    key: 'Mage',
    label: 'Mage',
    rarity: 'Common',
    classMod: { HP: 0.96, Mana: 1.16, Stamina: 0.96, Reserve: 1.05 },
    bonusPointCadence: 5,
    primaryShape: 'Spellcasting and mana',
  },
  Rogue: {
    key: 'Rogue',
    label: 'Rogue',
    rarity: 'Common',
    classMod: { HP: 0.9, Mana: 0.9, Stamina: 1.1, Reserve: 1.15 },
    bonusPointCadence: 5,
    primaryShape: 'Burst exploitation, weak-point pressure',
  },
  Scout: {
    key: 'Scout',
    label: 'Scout',
    rarity: 'Common',
    classMod: { HP: 0.96, Mana: 0.9, Stamina: 1.26, Reserve: 1.0 },
    bonusPointCadence: 5,
    primaryShape: 'Sustained movement, routes, threat-reading',
  },
  Healer: {
    key: 'Healer',
    label: 'Healer',
    rarity: 'Common',
    classMod: { HP: 1.0, Mana: 1.1, Stamina: 1.0, Reserve: 1.1 },
    bonusPointCadence: 5,
    primaryShape: 'Restoration and stabilization',
  },
  Warden: {
    key: 'Warden',
    label: 'Warden',
    rarity: 'Uncommon',
    classMod: { HP: 1.1, Mana: 1.06, Stamina: 1.06, Reserve: 1.15 },
    bonusPointCadence: 4,
    primaryShape: 'Boundaries and protection',
  },
  Psion: {
    key: 'Psion',
    label: 'Psion',
    rarity: 'Rare',
    classMod: { HP: 0.96, Mana: 1.1, Stamina: 0.96, Reserve: 1.2 },
    bonusPointCadence: 3,
    primaryShape: 'Will, mind, and Reserve pressure',
  },
  Adventurer: {
    key: 'Adventurer',
    label: 'Adventurer',
    rarity: 'Common',
    classMod: { HP: 1.04, Mana: 1.0, Stamina: 1.06, Reserve: 1.025 },
    bonusPointCadence: 5,
    primaryShape: 'Flexible survival',
  },
};

// Rarity badge colors
export const RARITY_COLORS: Record<ClassRarity, string> = {
  Unclassed: 'text-zinc-500 border-zinc-700',
  Common: 'text-zinc-300 border-zinc-600',
  Uncommon: 'text-green-400 border-green-700',
  Rare: 'text-blue-400 border-blue-700',
  Exceptional: 'text-violet-400 border-violet-700',
  Legendary: 'text-amber-400 border-amber-700',
  Mythic: 'text-orange-400 border-orange-700',
  Unique: 'text-red-400 border-red-700',
};

// Just the text color token per rarity (no border)
export const RARITY_TEXT_COLORS: Record<ClassRarity, string> = {
  Unclassed: 'text-zinc-500',
  Common: 'text-zinc-300',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Exceptional: 'text-violet-400',
  Legendary: 'text-amber-400',
  Mythic: 'text-orange-400',
  Unique: 'text-red-400',
};

// Spectra-mapped text color per soul level.
// Sub-Common (Fractured→Lesser) are muted grey; above Common they follow the
// site's spectral gradient (cyan→blue→purple→pink→gold).
export const SOUL_LEVEL_TEXT_COLORS: Record<SoulLevelKey, string> = {
  Fractured:    'text-zinc-600',
  Faint:        'text-zinc-500',
  Weak:         'text-zinc-400',
  Lesser:       'text-slate-400',
  Common:       'text-zinc-300',
  Strong:       'text-cyan-400',
  Luminous:     'text-sky-400',
  Radiant:      'text-blue-400',
  Brilliant:    'text-indigo-400',
  Resplendent:  'text-violet-400',
  Exalted:      'text-fuchsia-400',
  Transcendent: 'text-pink-400',
  Divine:       'text-rose-400',
  Absolute:     'text-amber-400',
};

// ────────────────────────────────────────────────
// §15  XP Curve and Class Rarity Multipliers
// ────────────────────────────────────────────────

/** BaseXP(L) = 75L + 25L·log₂(L+1) + 4L·(L−1) */
export function computeBaseXP(level: number): number {
  if (level < 1) return 0;
  return Math.round(75 * level + 25 * level * Math.log2(level + 1) + 4 * level * (level - 1));
}

export const CLASS_RARITY_XP_MULTIPLIERS: Record<ClassRarity, number> = {
  Unclassed: 1.0,
  Common: 1.0,
  Uncommon: 1.08,
  Rare: 1.16,
  Exceptional: 1.25,
  Legendary: 1.38,
  Mythic: 1.5,
  Unique: 1.65,
};

// ────────────────────────────────────────────────
// §14  Class Bonus Points
// ────────────────────────────────────────────────

/** ClassBonusPoints = ⌊max(0, CharLevel − AcqLevel) / ClassCadence⌋ */
export function computeClassBonusPoints(
  characterLevel: number,
  classAcquisitionLevel: number,
  bonusPointCadence: number,
): number {
  if (bonusPointCadence <= 0) return 0;
  const effective = Math.max(0, characterLevel - classAcquisitionLevel);
  return Math.floor(effective / bonusPointCadence);
}

// ────────────────────────────────────────────────
// §8  Depletion State Bands
// ────────────────────────────────────────────────

export interface DepletionBand {
  minPct: number;
  maxPct: number;
  label: string;
  description: string;
  color: string;
}

export const DEPLETION_BANDS: Record<'HP' | 'Mana' | 'Stamina' | 'Reserve', DepletionBand[]> = {
  HP: [
    {
      minPct: 75,
      maxPct: 100,
      label: 'Healthy',
      description: 'Combat capable',
      color: 'text-emerald-400',
    },
    {
      minPct: 50,
      maxPct: 74,
      label: 'Bloodied',
      description: 'Bruised, slowed',
      color: 'text-yellow-400',
    },
    {
      minPct: 25,
      maxPct: 49,
      label: 'Impaired',
      description: 'Pain penalties, concentration harder',
      color: 'text-orange-400',
    },
    {
      minPct: 1,
      maxPct: 24,
      label: 'Critical',
      description: 'Unstable, likely injury conditions',
      color: 'text-red-500',
    },
    {
      minPct: 0,
      maxPct: 0,
      label: 'Dead / Down',
      description: 'Death, dying, or catastrophic incapacitation',
      color: 'text-red-700',
    },
  ],
  Mana: [
    {
      minPct: 50,
      maxPct: 100,
      label: 'Normal',
      description: 'Normal casting',
      color: 'text-blue-400',
    },
    {
      minPct: 25,
      maxPct: 49,
      label: 'Strained',
      description: 'Headache, sensory pressure, spell inefficiency',
      color: 'text-yellow-400',
    },
    {
      minPct: 10,
      maxPct: 24,
      label: 'Migrained',
      description: 'Nausea, tremor, poor spell control',
      color: 'text-orange-400',
    },
    {
      minPct: 1,
      maxPct: 9,
      label: 'Mana-starved',
      description: 'Feedback pain, failed casting risk',
      color: 'text-red-500',
    },
    {
      minPct: 0,
      maxPct: 0,
      label: 'Crashed',
      description: 'Confusion, vomiting, cannot cast',
      color: 'text-red-700',
    },
  ],
  Stamina: [
    {
      minPct: 50,
      maxPct: 100,
      label: 'Normal',
      description: 'Normal exertion',
      color: 'text-emerald-400',
    },
    {
      minPct: 25,
      maxPct: 49,
      label: 'Tired',
      description: 'Heavy breathing, slower reactions',
      color: 'text-yellow-400',
    },
    {
      minPct: 10,
      maxPct: 24,
      label: 'Shaking',
      description: 'Poor coordination, weak grip',
      color: 'text-orange-400',
    },
    {
      minPct: 1,
      maxPct: 9,
      label: 'Collapsing',
      description: 'Collapse risk',
      color: 'text-red-500',
    },
    {
      minPct: 0,
      maxPct: 0,
      label: 'Collapsed',
      description: 'Hard physical stop',
      color: 'text-red-700',
    },
  ],
  Reserve: [
    {
      minPct: 50,
      maxPct: 100,
      label: 'Stable',
      description: 'Normal interface/system strain tolerance',
      color: 'text-violet-400',
    },
    {
      minPct: 25,
      maxPct: 49,
      label: 'Strained',
      description: 'Eye pain, pressure, tremors, emotional bleed',
      color: 'text-yellow-400',
    },
    {
      minPct: 10,
      maxPct: 24,
      label: 'Unstable',
      description: 'Interface instability, backlash risk',
      color: 'text-orange-400',
    },
    {
      minPct: 1,
      maxPct: 9,
      label: 'Warning',
      description: 'Soul/body routing failure risk',
      color: 'text-red-500',
    },
    {
      minPct: 0,
      maxPct: 0,
      label: 'Crashed',
      description: 'Interface crash, seizure-equivalent, soul strain',
      color: 'text-red-700',
    },
  ],
};

export function getDepletionBand(
  resource: keyof typeof DEPLETION_BANDS,
  pct: number,
): DepletionBand {
  const bands = DEPLETION_BANDS[resource];
  for (const band of bands) {
    if (pct >= band.minPct) return band;
  }
  return bands[bands.length - 1]!;
}

// ────────────────────────────────────────────────
// SCAFFOLD: Class attribute multipliers
// Not derived from any canon doc. All 1.0 until locked.
// Wire in canonical values when class attr mods are defined.
// ────────────────────────────────────────────────

export type AttrKey =
  | 'CON'
  | 'END'
  | 'STR'
  | 'AGI'
  | 'DEX'
  | 'INT'
  | 'WIS'
  | 'CHA'
  | 'Faith'
  | 'Occult'
  | 'LUCK';

/** SCAFFOLDED — all empty until canonical class attr mods are locked */
export const CLASS_ATTR_MODS: Record<ClassKey, Partial<Record<AttrKey, number>>> = {
  None: {},
  Warrior: {}, // SCAFFOLD: expect STR / CON / END bonus
  Mage: {}, // SCAFFOLD: expect INT / WIS bonus
  Rogue: {}, // SCAFFOLD: expect DEX / AGI bonus
  Scout: {}, // SCAFFOLD: expect AGI / DEX bonus
  Healer: {}, // SCAFFOLD: expect WIS / CHA bonus
  Warden: {}, // SCAFFOLD: expect CON / WIS bonus
  Psion: {}, // SCAFFOLD: expect INT / WIS / Faith bonus
  Adventurer: {}, // SCAFFOLD: varied
};

/** Returns the class attribute multiplier for a given key (1.0 if unset) */
export function getClassAttrMod(classKey: ClassKey, attrKey: AttrKey): number {
  return CLASS_ATTR_MODS[classKey]?.[attrKey] ?? 1.0;
}
