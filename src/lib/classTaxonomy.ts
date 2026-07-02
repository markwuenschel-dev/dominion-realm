// ─────────────────────────────────────────────────────────────────────────────
// lib/classTaxonomy.ts
// Full class taxonomy, transcribed from canon `classes.md`.
// Owns: the rarity ladder, the Prime/Core/Secondary attribute-multiplier firewall,
// and every class profile. Class influence enters the resource formulas ONLY
// through these attribute multipliers — never through direct resource multipliers
// and never through class-rarity bonus attribute points (both removed per canon).
//
// LCK in the source tables maps to the code's LUCK key.
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Attribute keys (shared with the sheet's extended attribute set)
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
  | 'CVN'
  | 'MYS'
  | 'LUCK';

// ────────────────────────────────────────────────
// Class Attribute Multiplier Firewall (from classes.md)
// ────────────────────────────────────────────────

export type AttrRole = 'Prime' | 'Core' | 'Secondary' | 'Neutral' | 'Dissonant';

/**
 * Locked multiplier table. Do not hand-edit per class — canon requires any
 * custom multiplier to be declared explicitly in that class's profile, and none
 * of the current profiles do, so every class uses this table uniformly.
 */
export const ATTR_ROLE_MULTIPLIERS: Record<AttrRole, number> = {
  Prime: 1.15,
  Core: 1.08,
  Secondary: 1.03,
  Neutral: 1.0,
  Dissonant: 0.95, // only when a class profile explicitly locks it — none currently do
};

// ────────────────────────────────────────────────
// Rarity ladder — prevalence-derived, replaces the old Exceptional-based ladder
// ────────────────────────────────────────────────

export type ClassRarity =
  | 'Unclassed'
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Fabled'
  | 'Legendary'
  | 'Mythic'
  | 'Unique';

/** Class keys are data-driven strings (see CLASS_PROFILES). */
export type ClassKey = string;

export interface ClassProfile {
  key: string;
  label: string;
  rarity: ClassRarity;
  primeAttrs: AttrKey[];
  coreAttrs: AttrKey[];
  secondaryAttrs: AttrKey[];
  resourceShape: string;
}

// ────────────────────────────────────────────────
// Rarity badge colors
// Epic reuses the old Exceptional violet slot; Fabled sits between Epic and
// Legendary with a distinct amber-leaning tone.
// ────────────────────────────────────────────────

export const RARITY_COLORS: Record<ClassRarity, string> = {
  Unclassed: 'text-zinc-500 border-zinc-700',
  Common: 'text-zinc-300 border-zinc-600',
  Uncommon: 'text-green-400 border-green-700',
  Rare: 'text-blue-400 border-blue-700',
  Epic: 'text-violet-400 border-violet-700',
  Fabled: 'text-amber-300 border-amber-800',
  Legendary: 'text-amber-400 border-amber-700',
  Mythic: 'text-orange-400 border-orange-700',
  Unique: 'text-red-400 border-red-700',
};

export const RARITY_TEXT_COLORS: Record<ClassRarity, string> = {
  Unclassed: 'text-zinc-500',
  Common: 'text-zinc-300',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-violet-400',
  Fabled: 'text-amber-300',
  Legendary: 'text-amber-400',
  Mythic: 'text-orange-400',
  Unique: 'text-red-400',
};

// ────────────────────────────────────────────────
// Class profiles, grouped by rarity tier
// Transcribed from classes.md. LCK → LUCK.
// ────────────────────────────────────────────────

const UNCLASSED: ClassProfile = {
  key: 'None',
  label: 'Unclassed',
  rarity: 'Unclassed',
  primeAttrs: [],
  coreAttrs: [],
  secondaryAttrs: [],
  resourceShape: 'No class modifier',
};

const COMMON: ClassProfile[] = [
  {
    key: 'Warrior',
    label: 'Warrior',
    rarity: 'Common',
    primeAttrs: ['STR', 'END'],
    coreAttrs: ['CON', 'AGI', 'DEX'],
    secondaryAttrs: ['WIS', 'CVN'],
    resourceShape: 'Stamina-heavy direct confrontation; force, endurance, weapons, commitment.',
  },
  {
    key: 'Fighter',
    label: 'Fighter',
    rarity: 'Common',
    primeAttrs: ['STR', 'CON'],
    coreAttrs: ['END', 'DEX'],
    secondaryAttrs: ['AGI', 'WIS'],
    resourceShape: 'Practical combat fundamentals; grit, weapons, brawling, survival.',
  },
  {
    key: 'Rogue',
    label: 'Rogue',
    rarity: 'Common',
    primeAttrs: ['DEX', 'AGI'],
    coreAttrs: ['WIS', 'INT'],
    secondaryAttrs: ['END', 'MYS'],
    resourceShape: 'Precision, misdirection, weak-point exploitation, concealed movement.',
  },
  {
    key: 'Mage',
    label: 'Mage',
    rarity: 'Common',
    primeAttrs: ['INT', 'WIS'],
    coreAttrs: ['MYS', 'CHA'],
    secondaryAttrs: ['DEX', 'END'],
    resourceShape: 'Mana-heavy supernatural manipulation through knowledge and shaped intent.',
  },
  {
    key: 'Hunter',
    label: 'Hunter',
    rarity: 'Common',
    primeAttrs: ['WIS', 'DEX'],
    coreAttrs: ['AGI', 'END'],
    secondaryAttrs: ['STR', 'INT'],
    resourceShape: 'Tracking, pursuit, targeting, terrain use, kill-window recognition.',
  },
  {
    key: 'Scout',
    label: 'Scout',
    rarity: 'Common',
    primeAttrs: ['AGI', 'WIS'],
    coreAttrs: ['END', 'DEX'],
    secondaryAttrs: ['INT', 'CON'],
    resourceShape: 'Movement, pathfinding, reconnaissance, escape, route discovery.',
  },
  {
    key: 'Healer',
    label: 'Healer',
    rarity: 'Common',
    primeAttrs: ['WIS', 'INT'],
    coreAttrs: ['CHA', 'CVN'],
    secondaryAttrs: ['DEX', 'END'],
    resourceShape: 'Repair, stabilization, restoration, triage, body-system support.',
  },
  {
    key: 'Artisan',
    label: 'Artisan',
    rarity: 'Common',
    primeAttrs: ['DEX', 'INT'],
    coreAttrs: ['END', 'WIS'],
    secondaryAttrs: ['STR', 'MYS'],
    resourceShape: 'Skilled creation, refinement, material understanding, durable output.',
  },
  {
    key: 'Merchant',
    label: 'Merchant',
    rarity: 'Common',
    primeAttrs: ['CHA', 'INT'],
    coreAttrs: ['WIS', 'DEX'],
    secondaryAttrs: ['LUCK', 'CVN'],
    resourceShape: 'Exchange, appraisal, leverage, contracts, logistics, value-flow.',
  },
  {
    key: 'Performer',
    label: 'Performer',
    rarity: 'Common',
    primeAttrs: ['CHA', 'DEX'],
    coreAttrs: ['AGI', 'WIS'],
    secondaryAttrs: ['INT', 'MYS'],
    resourceShape: 'Influence through rhythm, attention, emotion, presence, audience state.',
  },
  {
    key: 'Laborer',
    label: 'Laborer',
    rarity: 'Common',
    primeAttrs: ['END', 'STR'],
    coreAttrs: ['CON', 'DEX'],
    secondaryAttrs: ['WIS', 'CVN'],
    resourceShape: 'Work capacity, hauling, building, mining, farming, repetitive force.',
  },
  {
    key: 'Scribe',
    label: 'Scribe',
    rarity: 'Common',
    primeAttrs: ['INT', 'DEX'],
    coreAttrs: ['WIS', 'MYS'],
    secondaryAttrs: ['CHA', 'END'],
    resourceShape: 'Records, copying, translation, indexing, symbol discipline.',
  },
  {
    key: 'Adventurer',
    label: 'Adventurer',
    rarity: 'Common',
    primeAttrs: ['END', 'WIS'],
    coreAttrs: ['STR', 'AGI', 'INT'],
    secondaryAttrs: ['DEX', 'CON', 'LUCK'],
    resourceShape: 'Flexible survival, delving, mixed-skill adaptation, practical problem-solving.',
  },
  {
    key: 'Envoy',
    label: 'Envoy',
    rarity: 'Common',
    primeAttrs: ['CHA', 'WIS'],
    coreAttrs: ['INT', 'CVN'],
    secondaryAttrs: ['DEX', 'MYS'],
    resourceShape: 'Negotiation, access, representation, de-escalation, faction crossing.',
  },
  {
    key: 'Beastkeeper',
    label: 'Beastkeeper',
    rarity: 'Common',
    primeAttrs: ['WIS', 'CHA'],
    coreAttrs: ['END', 'CON'],
    secondaryAttrs: ['DEX', 'CVN'],
    resourceShape: 'Animal partnership, care, training, command through relationship.',
  },
  {
    key: 'Mariner',
    label: 'Mariner',
    rarity: 'Common',
    primeAttrs: ['END', 'WIS'],
    coreAttrs: ['DEX', 'STR'],
    secondaryAttrs: ['AGI', 'INT'],
    resourceShape: 'Ships, tides, weather, sea survival, crew rhythm.',
  },
  {
    key: 'Cultivator',
    label: 'Cultivator',
    rarity: 'Common',
    primeAttrs: ['WIS', 'END'],
    coreAttrs: ['CON', 'MYS'],
    secondaryAttrs: ['INT', 'DEX'],
    resourceShape: 'Growth, land, crops, ecosystems, husbandry, long-cycle improvement.',
  },
  {
    key: 'Sentinel',
    label: 'Sentinel',
    rarity: 'Common',
    primeAttrs: ['WIS', 'CON'],
    coreAttrs: ['END', 'DEX'],
    secondaryAttrs: ['STR', 'CVN'],
    resourceShape: 'Vigilance, holding watch, alarm, positional endurance.',
  },
  {
    key: 'Cook',
    label: 'Cook',
    rarity: 'Common',
    primeAttrs: ['DEX', 'WIS'],
    coreAttrs: ['END', 'INT'],
    secondaryAttrs: ['CHA', 'MYS'],
    resourceShape: 'Nourishment, preparation, preservation, morale, body-state support.',
  },
  {
    key: 'Caretaker',
    label: 'Caretaker',
    rarity: 'Common',
    primeAttrs: ['WIS', 'CHA'],
    coreAttrs: ['CON', 'END'],
    secondaryAttrs: ['CVN', 'DEX'],
    resourceShape: 'Care, maintenance, shelter, recovery, vulnerable-person protection.',
  },
  {
    key: 'Courier',
    label: 'Courier',
    rarity: 'Common',
    primeAttrs: ['AGI', 'END'],
    coreAttrs: ['WIS', 'DEX'],
    secondaryAttrs: ['CON', 'LUCK'],
    resourceShape: 'Speed, delivery, route memory, evasion, endurance movement.',
  },
  {
    key: 'Rider',
    label: 'Rider',
    rarity: 'Common',
    primeAttrs: ['AGI', 'WIS'],
    coreAttrs: ['END', 'CHA'],
    secondaryAttrs: ['STR', 'DEX'],
    resourceShape: 'Mounted movement, beast coordination, speed, balance, mobility.',
  },
];

const UNCOMMON: ClassProfile[] = [
  {
    key: 'Priest',
    label: 'Priest',
    rarity: 'Uncommon',
    primeAttrs: ['CVN', 'CHA'],
    coreAttrs: ['WIS', 'MYS'],
    secondaryAttrs: ['INT', 'END'],
    resourceShape: 'Invocation, rites, sacred law, purification, vow mediation.',
  },
  {
    key: 'Warden',
    label: 'Warden',
    rarity: 'Uncommon',
    primeAttrs: ['CON', 'WIS'],
    coreAttrs: ['END', 'CVN'],
    secondaryAttrs: ['STR', 'CHA'],
    resourceShape: 'Boundaries, protection, containment, structural integrity, transferred cost.',
  },
  {
    key: 'Summoner',
    label: 'Summoner',
    rarity: 'Uncommon',
    primeAttrs: ['CHA', 'MYS'],
    coreAttrs: ['WIS', 'INT'],
    secondaryAttrs: ['CVN', 'END'],
    resourceShape: 'Calling, binding, command, borrowed agency, externalized force.',
  },
  {
    key: 'Commander',
    label: 'Commander',
    rarity: 'Uncommon',
    primeAttrs: ['CHA', 'WIS'],
    coreAttrs: ['INT', 'CVN'],
    secondaryAttrs: ['END', 'STR'],
    resourceShape: 'Coordination, morale, role assignment, timing, collective action.',
  },
  {
    key: 'Tactician',
    label: 'Tactician',
    rarity: 'Uncommon',
    primeAttrs: ['INT', 'WIS'],
    coreAttrs: ['DEX', 'CHA'],
    secondaryAttrs: ['AGI', 'MYS'],
    resourceShape: 'Positioning, timing, formation logic, engagement structure.',
  },
  {
    key: 'Alchemist',
    label: 'Alchemist',
    rarity: 'Uncommon',
    primeAttrs: ['INT', 'DEX'],
    coreAttrs: ['WIS', 'MYS'],
    secondaryAttrs: ['END', 'LUCK'],
    resourceShape: 'Reaction control, distillation, potions, toxins, catalysts.',
  },
  {
    key: 'Artificer',
    label: 'Artificer',
    rarity: 'Uncommon',
    primeAttrs: ['INT', 'DEX'],
    coreAttrs: ['MYS', 'WIS'],
    secondaryAttrs: ['END', 'STR'],
    resourceShape: 'Magical mechanisms, constructs, devices, engines, repeatable systems.',
  },
  {
    key: 'Investigator',
    label: 'Investigator',
    rarity: 'Uncommon',
    primeAttrs: ['INT', 'WIS'],
    coreAttrs: ['DEX', 'CHA'],
    secondaryAttrs: ['MYS', 'END'],
    resourceShape: 'Evidence reconstruction, questioning, pattern linkage, hidden-cause discovery.',
  },
  {
    key: 'Judge',
    label: 'Judge',
    rarity: 'Uncommon',
    primeAttrs: ['WIS', 'CVN'],
    coreAttrs: ['INT', 'CHA'],
    secondaryAttrs: ['MYS', 'END'],
    resourceShape: 'Verdict, consequence, arbitration, lawful settlement, authority pressure.',
  },
  {
    key: 'Scholar',
    label: 'Scholar',
    rarity: 'Uncommon',
    primeAttrs: ['INT', 'WIS'],
    coreAttrs: ['MYS', 'DEX'],
    secondaryAttrs: ['CHA', 'END'],
    resourceShape: 'Study, interpretation, theory, preservation, deep-system comprehension.',
  },
  {
    key: 'Mystic',
    label: 'Mystic',
    rarity: 'Uncommon',
    primeAttrs: ['WIS', 'MYS'],
    coreAttrs: ['CVN', 'CHA'],
    secondaryAttrs: ['INT', 'END'],
    resourceShape: 'Inner revelation, hidden experience, altered awareness, unseen law.',
  },
  {
    key: 'Duelist',
    label: 'Duelist',
    rarity: 'Uncommon',
    primeAttrs: ['DEX', 'AGI'],
    coreAttrs: ['WIS', 'STR'],
    secondaryAttrs: ['END', 'CHA'],
    resourceShape: 'Single-opponent timing, counters, precision pressure, combat rhythm.',
  },
  {
    key: 'Keeper',
    label: 'Keeper',
    rarity: 'Uncommon',
    primeAttrs: ['WIS', 'CVN'],
    coreAttrs: ['CON', 'INT'],
    secondaryAttrs: ['CHA', 'END'],
    resourceShape: 'Preservation, custody, continuity, archives, inherited duties.',
  },
  {
    key: 'Architect',
    label: 'Architect',
    rarity: 'Uncommon',
    primeAttrs: ['INT', 'WIS'],
    coreAttrs: ['DEX', 'CVN'],
    secondaryAttrs: ['END', 'STR'],
    resourceShape: 'Structures, cities, fortifications, spatial systems, durable design.',
  },
  {
    key: 'Gambler',
    label: 'Gambler',
    rarity: 'Uncommon',
    primeAttrs: ['LUCK', 'WIS'],
    coreAttrs: ['DEX', 'CHA'],
    secondaryAttrs: ['MYS', 'INT'],
    resourceShape: 'Risk, wagers, bluffing, uncertainty exploitation, probability pressure.',
  },
];

const RARE: ClassProfile[] = [
  {
    key: 'Psion',
    label: 'Psion',
    rarity: 'Rare',
    primeAttrs: ['WIS', 'MYS'],
    coreAttrs: ['INT', 'CHA'],
    secondaryAttrs: ['DEX', 'END'],
    resourceShape: 'Mind, will, perception, attention, pressure, intent.',
  },
  {
    key: 'Oracle',
    label: 'Oracle',
    rarity: 'Rare',
    primeAttrs: ['WIS', 'MYS'],
    coreAttrs: ['CVN', 'INT'],
    secondaryAttrs: ['CHA', 'LUCK'],
    resourceShape: 'Omens, prophecy, causal sensitivity, fate-pressure, uncertain futures.',
  },
  {
    key: 'Binder',
    label: 'Binder',
    rarity: 'Rare',
    primeAttrs: ['CVN', 'MYS'],
    coreAttrs: ['INT', 'CHA'],
    secondaryAttrs: ['WIS', 'DEX'],
    resourceShape: 'Contracts, seals, restraints, containment, oath-structures.',
  },
  {
    key: 'Namekeeper',
    label: 'Namekeeper',
    rarity: 'Rare',
    primeAttrs: ['MYS', 'CVN'],
    coreAttrs: ['WIS', 'INT'],
    secondaryAttrs: ['CHA', 'DEX'],
    resourceShape: 'Names, recognition, essence, addressability, identity continuity.',
  },
  {
    key: 'Soulkeeper',
    label: 'Soulkeeper',
    rarity: 'Rare',
    primeAttrs: ['MYS', 'WIS'],
    coreAttrs: ['CVN', 'CHA'],
    secondaryAttrs: ['INT', 'END'],
    resourceShape: 'Souls, ghosts, afterlife thresholds, continuity of self.',
  },
  {
    key: 'Shaper',
    label: 'Shaper',
    rarity: 'Rare',
    primeAttrs: ['MYS', 'INT'],
    coreAttrs: ['WIS', 'DEX'],
    secondaryAttrs: ['STR', 'END'],
    resourceShape: 'Body, matter, form, environment reshaping, structural alteration.',
  },
  {
    key: 'Votary',
    label: 'Votary',
    rarity: 'Rare',
    primeAttrs: ['CVN', 'END'],
    coreAttrs: ['CHA', 'WIS'],
    secondaryAttrs: ['CON', 'MYS'],
    resourceShape: 'Self-binding, vows, devotion, sacrifice-fueled endurance.',
  },
  {
    key: 'Medium',
    label: 'Medium',
    rarity: 'Rare',
    primeAttrs: ['MYS', 'CHA'],
    coreAttrs: ['WIS', 'CVN'],
    secondaryAttrs: ['INT', 'CON'],
    resourceShape: 'Spirits, echoes, possession-risk, ghost contact, unseen presences.',
  },
  {
    key: 'Seer',
    label: 'Seer',
    rarity: 'Rare',
    primeAttrs: ['WIS', 'MYS'],
    coreAttrs: ['INT', 'LUCK'],
    secondaryAttrs: ['CVN', 'CHA'],
    resourceShape: 'Hidden truths, distant sight, pattern glimpses, incomplete revelation.',
  },
];

const EPIC: ClassProfile[] = [
  {
    key: 'Arbiter',
    label: 'Arbiter',
    rarity: 'Epic',
    primeAttrs: ['WIS', 'CVN'],
    coreAttrs: ['INT', 'CHA'],
    secondaryAttrs: ['MYS', 'END'],
    resourceShape: 'Binding judgment, dispute finality, consequence allocation.',
  },
  {
    key: 'Inquisitor',
    label: 'Inquisitor',
    rarity: 'Epic',
    primeAttrs: ['WIS', 'CVN'],
    coreAttrs: ['INT', 'DEX'],
    secondaryAttrs: ['CHA', 'MYS'],
    resourceShape: 'Truth extraction, corruption detection, pursuit of hidden violation.',
  },
  {
    key: 'Thaumaturge',
    label: 'Thaumaturge',
    rarity: 'Epic',
    primeAttrs: ['INT', 'MYS'],
    coreAttrs: ['WIS', 'CHA'],
    secondaryAttrs: ['DEX', 'END'],
    resourceShape: 'Advanced magical method; miracles through technical supernatural precision.',
  },
  {
    key: 'Runewright',
    label: 'Runewright',
    rarity: 'Epic',
    primeAttrs: ['INT', 'DEX'],
    coreAttrs: ['MYS', 'WIS'],
    secondaryAttrs: ['END', 'CVN'],
    resourceShape: 'Written power, runes, arrays, durable magical instruction.',
  },
  {
    key: 'Exorcist',
    label: 'Exorcist',
    rarity: 'Epic',
    primeAttrs: ['CVN', 'WIS'],
    coreAttrs: ['MYS', 'CHA'],
    secondaryAttrs: ['END', 'INT'],
    resourceShape: 'Expulsion, possession resistance, spiritual severance, cleansing rites.',
  },
  {
    key: 'Oathbearer',
    label: 'Oathbearer',
    rarity: 'Epic',
    primeAttrs: ['CVN', 'END'],
    coreAttrs: ['CHA', 'WIS'],
    secondaryAttrs: ['CON', 'STR'],
    resourceShape: 'Power through sworn burdens, promise-weight, personal binding.',
  },
  {
    key: 'Dreamwalker',
    label: 'Dreamwalker',
    rarity: 'Epic',
    primeAttrs: ['MYS', 'WIS'],
    coreAttrs: ['CHA', 'INT'],
    secondaryAttrs: ['CVN', 'LUCK'],
    resourceShape: 'Dreams, inner landscapes, sleeping minds, symbolic passage.',
  },
  {
    key: 'VoidTouched',
    label: 'Void-Touched',
    rarity: 'Epic',
    primeAttrs: ['MYS', 'CON'],
    coreAttrs: ['WIS', 'CVN'],
    secondaryAttrs: ['INT', 'END'],
    resourceShape: 'Survival against absence, emptiness, null pressure, impossible spaces.',
  },
];

const FABLED: ClassProfile[] = [
  {
    key: 'Archmage',
    label: 'Archmage',
    rarity: 'Fabled',
    primeAttrs: ['INT', 'MYS'],
    coreAttrs: ['WIS', 'CHA'],
    secondaryAttrs: ['DEX', 'END'],
    resourceShape: 'Master-scale spell architecture, deep theory, high-order casting.',
  },
  {
    key: 'Dreadnought',
    label: 'Dreadnought',
    rarity: 'Fabled',
    primeAttrs: ['CON', 'END'],
    coreAttrs: ['STR', 'CVN'],
    secondaryAttrs: ['WIS', 'MYS'],
    resourceShape: 'Immovable endurance, battlefield anchoring, catastrophic punishment tolerance.',
  },
  {
    key: 'Dragonrider',
    label: 'Dragonrider',
    rarity: 'Fabled',
    primeAttrs: ['CHA', 'WIS'],
    coreAttrs: ['END', 'STR'],
    secondaryAttrs: ['AGI', 'CVN'],
    resourceShape: 'Apex beast-bond, aerial command, shared will, high-risk mobility.',
  },
  {
    key: 'Gravemaster',
    label: 'Gravemaster',
    rarity: 'Fabled',
    primeAttrs: ['MYS', 'WIS'],
    coreAttrs: ['CVN', 'INT'],
    secondaryAttrs: ['CHA', 'END'],
    resourceShape:
      'Death-continuity, grave authority, ancestor/ghost command without cheap necromancy.',
  },
  {
    key: 'StarSinger',
    label: 'Star-Singer',
    rarity: 'Fabled',
    primeAttrs: ['CHA', 'MYS'],
    coreAttrs: ['WIS', 'CVN'],
    secondaryAttrs: ['INT', 'END'],
    resourceShape: 'Celestial resonance, song-as-law, harmonic authority over distance and omen.',
  },
];

const LEGENDARY: ClassProfile[] = [
  {
    key: 'Realmwalker',
    label: 'Realmwalker',
    rarity: 'Legendary',
    primeAttrs: ['MYS', 'WIS'],
    coreAttrs: ['INT', 'END'],
    secondaryAttrs: ['AGI', 'CVN'],
    resourceShape: 'Planar crossing, distance rupture, boundary traversal, world-pathing.',
  },
  {
    key: 'Saint',
    label: 'Saint',
    rarity: 'Legendary',
    primeAttrs: ['CVN', 'CHA'],
    coreAttrs: ['WIS', 'MYS'],
    secondaryAttrs: ['END', 'INT'],
    resourceShape: 'Sacred authority, miracle-bearing, spiritual gravity, devotion made manifest.',
  },
];

const MYTHIC: ClassProfile[] = [
  {
    key: 'Aetherist',
    label: 'Aetherist',
    rarity: 'Mythic',
    primeAttrs: ['MYS', 'WIS'],
    coreAttrs: ['INT', 'CVN'],
    secondaryAttrs: ['CHA', 'END'],
    resourceShape:
      'Aether synthesis, foundational elemental harmony, substrate-level manipulation.',
  },
  {
    key: 'Fatewright',
    label: 'Fatewright',
    rarity: 'Mythic',
    primeAttrs: ['LUCK', 'MYS'],
    coreAttrs: ['WIS', 'CVN'],
    secondaryAttrs: ['INT', 'CHA'],
    resourceShape:
      'Probability-flow shaping, fate pressure, entropy cost, uncertain-outcome control.',
  },
  {
    key: 'NameEater',
    label: 'Name-Eater',
    rarity: 'Mythic',
    primeAttrs: ['MYS', 'CVN'],
    coreAttrs: ['WIS', 'CHA'],
    secondaryAttrs: ['INT', 'CON'],
    resourceShape: 'Devouring addressability, erasure pressure, identity predation.',
  },
  {
    key: 'Incarnate',
    label: 'Incarnate',
    rarity: 'Mythic',
    primeAttrs: ['CVN', 'MYS'],
    coreAttrs: ['CON', 'CHA'],
    secondaryAttrs: ['WIS', 'END'],
    resourceShape: 'Embodiment of a principle rather than ordinary technique.',
  },
  {
    key: 'Worldroot',
    label: 'Worldroot',
    rarity: 'Mythic',
    primeAttrs: ['WIS', 'CON'],
    coreAttrs: ['MYS', 'END'],
    secondaryAttrs: ['CVN', 'CHA'],
    resourceShape: 'Ecological anchoring, land-body continuity, place-scale vitality.',
  },
  {
    key: 'Chronarch',
    label: 'Chronarch',
    rarity: 'Mythic',
    primeAttrs: ['MYS', 'INT'],
    coreAttrs: ['WIS', 'CVN'],
    secondaryAttrs: ['END', 'LUCK'],
    resourceShape: 'Time authority, sequence pressure, causality burden, temporal rulership.',
  },
  {
    key: 'Worldbreaker',
    label: 'Worldbreaker',
    rarity: 'Mythic',
    primeAttrs: ['CVN', 'STR'],
    coreAttrs: ['END', 'WIS'],
    secondaryAttrs: ['CON', 'MYS'],
    resourceShape:
      'Severance-at-scale; breaks impossible opposition, imposed structures, false continuity, and pressure-stabilized systems.',
  },
];

// Unique: one-of-one narrative titles. Kept for reference/lookup only — excluded
// from the picker (see classesByRarity consumers). Canonical resource/method-shape
// prose lives in classes.md; not surfaced in the UI, so a short marker is used here
// rather than risk transcription drift on the long narrative one-liners.
const UNIQUE_SHAPE = 'Reserved / narrative-only — one-of-one title.';
const UNIQUE: ClassProfile[] = [
  {
    key: 'FirstWoundOfHeaven',
    label: 'First Wound of Heaven',
    rarity: 'Unique',
    primeAttrs: ['CVN', 'MYS'],
    coreAttrs: ['WIS', 'CHA'],
    secondaryAttrs: ['END', 'INT'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'LastDoorOfTheDead',
    label: 'Last Door of the Dead',
    rarity: 'Unique',
    primeAttrs: ['MYS', 'CVN'],
    coreAttrs: ['WIS', 'CON'],
    secondaryAttrs: ['INT', 'CHA'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'TheUnnamedKing',
    label: 'The Unnamed King',
    rarity: 'Unique',
    primeAttrs: ['MYS', 'CHA'],
    coreAttrs: ['CVN', 'WIS'],
    secondaryAttrs: ['INT', 'CON'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'GriefEngineSaint',
    label: 'Grief-Engine Saint',
    rarity: 'Unique',
    primeAttrs: ['CVN', 'END'],
    coreAttrs: ['WIS', 'MYS'],
    secondaryAttrs: ['CHA', 'CON'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'CrownOfTheBrokenWorld',
    label: 'Crown of the Broken World',
    rarity: 'Unique',
    primeAttrs: ['CVN', 'MYS'],
    coreAttrs: ['CON', 'WIS'],
    secondaryAttrs: ['CHA', 'END'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'TheSeventhSilence',
    label: 'The Seventh Silence',
    rarity: 'Unique',
    primeAttrs: ['MYS', 'WIS'],
    coreAttrs: ['INT', 'CVN'],
    secondaryAttrs: ['DEX', 'CHA'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'GodsbaneWitness',
    label: 'Godsbane Witness',
    rarity: 'Unique',
    primeAttrs: ['WIS', 'MYS'],
    coreAttrs: ['CVN', 'INT'],
    secondaryAttrs: ['CON', 'LUCK'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'TheUnreturningPath',
    label: 'The Unreturning Path',
    rarity: 'Unique',
    primeAttrs: ['MYS', 'END'],
    coreAttrs: ['WIS', 'AGI'],
    secondaryAttrs: ['CVN', 'INT'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'AshesOfTheFirstFlame',
    label: 'Ashes of the First Flame',
    rarity: 'Unique',
    primeAttrs: ['CVN', 'END'],
    coreAttrs: ['STR', 'MYS'],
    secondaryAttrs: ['WIS', 'CON'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'TheHollowSun',
    label: 'The Hollow Sun',
    rarity: 'Unique',
    primeAttrs: ['MYS', 'CON'],
    coreAttrs: ['WIS', 'CVN'],
    secondaryAttrs: ['INT', 'CHA'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'TheMercyThatRefused',
    label: 'The Mercy That Refused',
    rarity: 'Unique',
    primeAttrs: ['CVN', 'WIS'],
    coreAttrs: ['CHA', 'MYS'],
    secondaryAttrs: ['END', 'INT'],
    resourceShape: UNIQUE_SHAPE,
  },
  {
    key: 'TheNameBeneathNames',
    label: 'The Name Beneath Names',
    rarity: 'Unique',
    primeAttrs: ['MYS', 'CVN'],
    coreAttrs: ['WIS', 'INT'],
    secondaryAttrs: ['CHA', 'CON'],
    resourceShape: UNIQUE_SHAPE,
  },
];

const ALL_PROFILES: ClassProfile[] = [
  UNCLASSED,
  ...COMMON,
  ...UNCOMMON,
  ...RARE,
  ...EPIC,
  ...FABLED,
  ...LEGENDARY,
  ...MYTHIC,
  ...UNIQUE,
];

/** Lookup keyed by class key. Falls back via getClassProfile. */
export const CLASS_PROFILES: Record<string, ClassProfile> = Object.fromEntries(
  ALL_PROFILES.map((p) => [p.key, p]),
);

/** Resolve a class key to its profile, defaulting to Unclassed for unknown keys. */
export function getClassProfile(key: string): ClassProfile {
  return CLASS_PROFILES[key] ?? UNCLASSED;
}

/** Rarity tiers surfaced in the class picker (Unclassed and Unique excluded). */
export const PICKER_RARITIES: ClassRarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Fabled',
  'Legendary',
  'Mythic',
];

/** Profiles grouped by rarity tier — for the rarity-grouped class picker. */
export const classesByRarity: Record<ClassRarity, ClassProfile[]> = {
  Unclassed: [UNCLASSED],
  Common: COMMON,
  Uncommon: UNCOMMON,
  Rare: RARE,
  Epic: EPIC,
  Fabled: FABLED,
  Legendary: LEGENDARY,
  Mythic: MYTHIC,
  Unique: UNIQUE,
};

// ────────────────────────────────────────────────
// Multiplier lookup
// ────────────────────────────────────────────────

/**
 * Prime → ×1.15, Core → ×1.08, Secondary → ×1.03, everything else → ×1.00.
 * 'Unclassed' resolves every attribute to Neutral (×1.00).
 */
export function getClassAttrMultiplier(profile: ClassProfile, attr: AttrKey): number {
  if (profile.primeAttrs.includes(attr)) return ATTR_ROLE_MULTIPLIERS.Prime;
  if (profile.coreAttrs.includes(attr)) return ATTR_ROLE_MULTIPLIERS.Core;
  if (profile.secondaryAttrs.includes(attr)) return ATTR_ROLE_MULTIPLIERS.Secondary;
  return ATTR_ROLE_MULTIPLIERS.Neutral;
}
