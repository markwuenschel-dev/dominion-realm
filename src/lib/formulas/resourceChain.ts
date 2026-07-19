// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/resourceChain.ts
// The one resource-derivation pipeline both surfaces run through.
//
//   effectiveAttribute → the class seam: a raw attribute becomes its effective
//     value (scaled by its class multiplier, rounded ONCE). LUCK is never scaled.
//   resourceCore       → the shared depth: rounded §1 base maxima, then race ×
//     condition (Reserve additionally × soul), rounded final. Rounds the §1 base
//     ONCE so the breakdown's base and the final's multiplicand are one value.
//   computeSheetResources     → sheet adapter: real class profile + race/condition.
//   computeCalculatorResources → calculator adapter: NEUTRAL_PROFILE, identity mods.
//
// The calculator used to reach past this seam and call computeResourceMaxima on
// raw attributes, unrounded — so the two surfaces agreed only at the §1 leaves.
// Now both derive maxima here; the calculator simply passes the neutral profile.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getClassAttrMultiplier,
  NEUTRAL_PROFILE,
  type ClassProfile,
  type AttrKey,
} from '@/lib/classTaxonomy';
import { computeResourceMaxima } from './resources';
import { FORMULA_ATTRIBUTE_KEYS } from '@/types/characterSheet';
import type { Attributes, ResourceMaxima } from '@/types';
import type {
  CharacterSheetAttributes,
  FinalResources,
  ResourceBreakdown,
} from '@/types/characterSheet';

const RESOURCE_KEYS = ['HP', 'Mana', 'Stamina', 'Reserve'] as const;

/** Per-resource scalar modifiers (race, condition). */
export type ResourceModifiers = { HP: number; Mana: number; Stamina: number; Reserve: number };

/** Identity modifiers — the neutral input the calculator passes (no race/condition). */
const IDENTITY_MODS: ResourceModifiers = { HP: 1, Mana: 1, Stamina: 1, Reserve: 1 };

export interface ResourceChainInput {
  /** Raw attributes straight from the store (all 11 keys; LUCK is ignored by the formula). */
  attributes: CharacterSheetAttributes;
  profile: ClassProfile;
  raceMod: ResourceModifiers;
  conditionMods: ResourceModifiers;
  /** Applied to Reserve only. */
  soulMult: number;
}

export interface ResourceChain {
  /** The 10 rounded, class-scaled formula attributes — the same values the UI shows. */
  effectiveAttributes: Attributes;
  /** Rounded §1 base maxima from the effective attributes (soulLevelMod = 1.0). */
  maxima: ResourceMaxima;
  /** Rendered maxima: maxima × race × condition (Reserve additionally × soul), rounded. */
  finalResources: FinalResources;
  breakdowns: ResourceBreakdown[];
}

/** The core's output: the rounded §1 base and the rendered final maxima. */
export interface ResourceCore {
  /** §1 base maxima, ROUNDED ONCE — the single base the breakdown and final share. */
  maxima: ResourceMaxima;
  /** round(maxima[r] × mods[r] × soul); soul applies to Reserve only. */
  finalResources: ResourceMaxima;
}

/** An attribute's class multiplier and its resulting effective (rounded) value. */
export interface EffectiveAttributeParts {
  multiplier: number;
  effective: number;
}

/**
 * Resolve a raw attribute to its class multiplier AND effective value in one
 * place. The single home for the LUCK firewall: LUCK carries a ×1.0 multiplier
 * and is never scaled, even for classes that list it as Prime/Core/Secondary
 * (Gambler, Fatewright, …). Consumed by `effectiveAttribute` (the formula path)
 * and the sheet's per-attribute badge (the display path), so the multiplier the
 * cell shows and the value the formula uses can never disagree on the LUCK rule.
 */
export function describeEffectiveAttribute(
  raw: number,
  profile: ClassProfile,
  attr: AttrKey,
): EffectiveAttributeParts {
  if (attr === 'LUCK') return { multiplier: 1, effective: raw };
  const multiplier = getClassAttrMultiplier(profile, attr);
  return { multiplier, effective: Math.round(raw * multiplier) };
}

/**
 * The effective value of an attribute: scaled by its Prime/Core/Secondary/Neutral
 * multiplier and rounded once. Thin projection of `describeEffectiveAttribute`.
 */
export function effectiveAttribute(raw: number, profile: ClassProfile, attr: AttrKey): number {
  return describeEffectiveAttribute(raw, profile, attr).effective;
}

/**
 * The 10 formula attributes resolved to their effective (class-scaled, rounded)
 * values under `profile`. Typed on the 10-key `Attributes` base so both the
 * sheet (`CharacterSheetAttributes` extends it) and the calculator pass through;
 * LUCK is never read (it is not a `FORMULA_ATTRIBUTE_KEYS` member).
 */
export function effectiveAttributes(raw: Attributes, profile: ClassProfile): Attributes {
  const out = {} as Attributes;
  for (const key of FORMULA_ATTRIBUTE_KEYS) {
    out[key] = effectiveAttribute(raw[key], profile, key);
  }
  return out;
}

/**
 * The shared depth. Rounds the §1 base once, then applies the per-resource
 * modifiers and (for Reserve) the soul multiplier, rounding the final. Both the
 * sheet and calculator adapters compose this; nothing else should reach past it.
 */
export function resourceCore(
  effectiveAttrs: Attributes,
  mods: ResourceModifiers,
  soulMult: number,
): ResourceCore {
  const rawMaxima = computeResourceMaxima(effectiveAttrs, 1.0);
  const maxima = {} as ResourceMaxima;
  const finalResources = {} as ResourceMaxima;
  for (const r of RESOURCE_KEYS) {
    // Round the §1 base ONCE. Effective attributes are integers and the §1
    // coefficients are integers, so on the sheet this is a no-op; it becomes
    // load-bearing only for the calculator's Reserve × a fractional soul.
    maxima[r] = Math.round(rawMaxima[r]);
    const soul = r === 'Reserve' ? soulMult : 1;
    finalResources[r] = Math.round(maxima[r] * mods[r] * soul);
  }
  return { maxima, finalResources };
}

/**
 * The full §1 → final resource chain for the CHARACTER SHEET. Class influence
 * enters once, at the attribute layer, via `effectiveAttributes` — the same seam
 * the per-attribute cells display — so display and formula cannot diverge.
 */
export function computeSheetResources(input: ResourceChainInput): ResourceChain {
  const { attributes, profile, raceMod, conditionMods, soulMult } = input;

  const effective = effectiveAttributes(attributes, profile);

  const mods = {} as ResourceModifiers;
  for (const r of RESOURCE_KEYS) {
    mods[r] = raceMod[r] * conditionMods[r];
  }

  const { maxima, finalResources } = resourceCore(effective, mods, soulMult);

  const breakdowns: ResourceBreakdown[] = RESOURCE_KEYS.map((r) => ({
    resource: r,
    attributeValue: maxima[r],
    raceMod: raceMod[r],
    soulMultiplier: r === 'Reserve' ? soulMult : 1,
    conditionMod: conditionMods[r],
    final: finalResources[r],
  }));

  return { effectiveAttributes: effective, maxima, finalResources, breakdowns };
}

/**
 * The §1 maxima for the standalone CALCULATOR: raw attributes under the neutral
 * class (every multiplier ×1.0), no race/condition, with the free-float soul
 * modifier applied to Reserve. Reserve is now rounded to an integer like every
 * other maximum — the calculator previously returned it unrounded, the lone
 * float among integer maxima.
 */
export function computeCalculatorResources(
  attributes: Attributes,
  soulLevelMod: number,
): ResourceMaxima {
  const effective = effectiveAttributes(attributes, NEUTRAL_PROFILE);
  return resourceCore(effective, IDENTITY_MODS, soulLevelMod).finalResources;
}
