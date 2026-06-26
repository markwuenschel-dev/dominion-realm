// ─────────────────────────────────────────────────────────────────────────────
// types/index.ts  —  Dominion Realm formula domain types
// All formula logic in lib/formulas/ references these exclusively.
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// §1  ATTRIBUTES
// ────────────────────────────────────────────────

export interface Attributes {
  // Physical
  CON: number   // Constitution  — HP max, regen, resistance backbone
  END: number   // Endurance     — Stamina max, physical durability
  STR: number   // Strength      — HP max, Stamina max, physical output
  AGI: number   // Agility       — Stamina max, Stagger resistance
  DEX: number   // Dexterity     — Stamina max, fine motor control

  // Mental / Metaphysical
  INT: number   // Intelligence  — Mana max, mana crash resistance
  WIS: number   // Wisdom        — Mana max, Reserve regen, clearance
  CHA: number   // Charisma      — Mana max (social/aura conductor)

  // Soul-tier
  Faith: number   // Reserve max, Reserve regen
  Occult: number  // Reserve max, Reserve regen
}

export const ATTRIBUTE_KEYS = [
  'CON', 'END', 'STR', 'AGI', 'DEX',
  'INT', 'WIS', 'CHA',
  'Faith', 'Occult',
] as const satisfies (keyof Attributes)[]

export type AttributeKey = keyof Attributes

/** Grouping for UI layout in the attribute panel */
export const ATTRIBUTE_GROUPS: { label: string; keys: AttributeKey[] }[] = [
  { label: 'Physical',        keys: ['CON', 'END', 'STR', 'AGI', 'DEX'] },
  { label: 'Mental',          keys: ['INT', 'WIS', 'CHA'] },
  { label: 'Soul',            keys: ['Faith', 'Occult'] },
]

// ────────────────────────────────────────────────
// §2  RESOURCE MAXIMA
// ────────────────────────────────────────────────

export interface ResourceMaxima {
  HP: number
  Mana: number
  Stamina: number
  Reserve: number
}

export type ResourceKey = keyof ResourceMaxima

export const RESOURCE_KEYS = ['HP', 'Mana', 'Stamina', 'Reserve'] as const satisfies ResourceKey[]

export interface ResourceColor {
  bg: string       // Tailwind bg class
  text: string     // Tailwind text class
  border: string   // Tailwind border class
  hex: string      // Raw hex for SVG
}

export const RESOURCE_COLORS: Record<ResourceKey, ResourceColor> = {
  HP:      { bg: 'bg-red-500',    text: 'text-red-400',    border: 'border-red-500/40',    hex: '#ef4444' },
  Mana:    { bg: 'bg-blue-500',   text: 'text-blue-400',   border: 'border-blue-500/40',   hex: '#3b82f6' },
  Stamina: { bg: 'bg-emerald-500',text: 'text-emerald-400',border: 'border-emerald-500/40',hex: '#10b981' },
  Reserve: { bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500/40', hex: '#8b5cf6' },
}

// ────────────────────────────────────────────────
// §3  CURRENT RESOURCE STATE
// ────────────────────────────────────────────────

/** Current resource values (used for regen curve calculation) */
export interface CurrentResources {
  HP: number
  Mana: number
  Stamina: number
  Reserve: number
}

/** q = R(t) / R_max for each resource */
export interface ResourceRatios {
  HP: number
  Mana: number
  Stamina: number
  Reserve: number
}

// ────────────────────────────────────────────────
// §4  REGENERATION
// ────────────────────────────────────────────────

export interface BaseRegen {
  HP: number
  Mana: number
  Stamina: number
  Reserve: number
}

export interface RegenCurveParams {
  /** Safe-low threshold; maximum regen occurs at q = q_s (default 0.10) */
  q_s: number
  /** Forgiving curvature exponent for safe zone (default 0.45) */
  gamma: number
  /** Failure suppression exponent for failure zone (default 2) */
  p: number
}

export interface RegenModifiers {
  /** 1.0 = normal; sleep ~2.0; rest ~1.5; combat ~0.5 */
  recoveryStateMod: number
  /** Any additional modifier (NutritionMod, FocusStateMod, etc.) */
  additionalMod: number
}

export interface RegenResult {
  resource: ResourceKey
  baseRegen: number
  multiplier: number    // output of computeRegenMultiplier(q)
  actualRegen: number   // baseRegen × recoveryStateMod × multiplier
  zone: RegenZone
}

export type RegenZone = 'safe' | 'failure' | 'zero'

// ────────────────────────────────────────────────
// §5  RESERVE ACCOUNTING
// ────────────────────────────────────────────────

export interface ReserveAccountingInput {
  /** 1 Reserve = 5 Mana deficit */
  forcedManaDeficit: number
  /** 1 Reserve = 5 Stamina deficit */
  forcedStaminaDeficit: number
}

export interface ReserveAccountingResult {
  reserveDebit: number
  manaConversionRate: 5
  staminaConversionRate: 5
}

// ────────────────────────────────────────────────
// §6  CONDITIONS & INJURY
// ────────────────────────────────────────────────

export type SeverityBand = 'none' | 'minor' | 'moderate' | 'severe' | 'catastrophic'

export interface ConditionInput {
  /** Accumulated condition load C_i(t) */
  load: number
  /** Resistance_i from attributes */
  resistance: number
  /** Width between severity bands */
  thresholdWidth: number
}

export interface ConditionResult {
  severity: number
  band: SeverityBand
  description: string
}

// Known resistance approximations from §11
export const RESISTANCE_FORMULAS: Record<string, string> = {
  Poison:    'CON + 0.5×WIS',
  Stagger:   '0.5×STR + 0.3×END + 0.2×AGI',
  ManaCrash: '0.5×WIS + 0.3×INT + 0.2×CON',
}

export interface PenetrationInput {
  sourceAccess: number
  barrier: number
  /** Hill-coefficient; 1 = standard; >1 = steeper transition */
  alpha: number
}

export interface PenetrationResult {
  penetration: number  // 0–1
  label: string
}

// ────────────────────────────────────────────────
// §7  FAILURE STATES
// ────────────────────────────────────────────────

export type FailureZone = 'safe' | 'overextension' | 'collapse' | 'catastrophic'

export interface ResourceZoneState {
  resource: ResourceKey
  zone: FailureZone
  description: string
  /** Whether Reserve is available to buffer this resource */
  reserveBuffered: boolean
}

// ────────────────────────────────────────────────
// §8  HEALING PIPELINE
// ────────────────────────────────────────────────

/** A single repair channel in the healing pipeline (§§12–20) */
export interface HealingChannel {
  id: string
  label: string
  /** Repair demand W_j */
  demand: number
  /** Healer intent weight — Priority_j(t) */
  priority: number
  /** Domain compatibility Compatibility_j (0–2.0) */
  compatibility: number
  /** Healing access A_heal,j */
  healingAccess: number
  /** Healing barrier B_heal,j */
  barrier: number
  /** Penetration hill exponent α_j */
  alpha: number
  /** Absorption saturation constant K_{W,j} */
  K_W: number
  /** Biological/metaphysical repair efficiency η_j (0–1) */
  eta: number
}

export interface HealingPulseInput {
  /** Raw healing source power H_0 */
  H0: number
  channels: HealingChannel[]
}

export interface ChannelResult {
  id: string
  label: string
  /** Weight = Priority × Demand × Compatibility */
  weight: number
  /** a_j = weight / totalWeight */
  allocation: number
  /** P_heal,j from penetration formula */
  penetration: number
  /** W_j / (W_j + K_W,j) */
  absorption: number
  /** H0 × a_j × P_j × Compat_j × Absorb_j × η_j */
  repair: number
}

export interface HealingPulseResult {
  totalWeight: number
  totalRepair: number
  channels: ChannelResult[]
}

// ────────────────────────────────────────────────
// §9  FULL CALCULATOR STATE (for Zustand store)
// ────────────────────────────────────────────────

export interface CalculatorState {
  attributes: Attributes
  currentResources: CurrentResources
  soulLevelMod: number
  recoveryStateMod: number
  regenCurveParams: RegenCurveParams
  healingPulse: HealingPulseInput
  conditionInputs: ConditionInput[]
}
