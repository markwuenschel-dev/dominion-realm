// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/resourceChain.ts
// The effective-attribute seam. One place a raw attribute becomes its effective
// value: scaled by its class multiplier, then rounded ONCE to an integer. That
// integer drives BOTH the sheet's display and the §1 resource formulas, so the
// two can never disagree (they did — the hook fed the unrounded product to the
// formula while the UI displayed the rounded one).
// ─────────────────────────────────────────────────────────────────────────────

import { getClassAttrMultiplier, type ClassProfile, type AttrKey } from '@/lib/classTaxonomy';
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
  /** §1 maxima computed from `effectiveAttributes` (soulLevelMod = 1.0). */
  maxima: ResourceMaxima;
  /** Rendered maxima: maxima × race × condition (Reserve additionally × soul), rounded. */
  finalResources: FinalResources;
  breakdowns: ResourceBreakdown[];
}

/**
 * Resolve a raw attribute to its effective value under a class profile.
 * Scales by the Prime/Core/Secondary/Neutral multiplier, then rounds once.
 */
export function effectiveAttribute(raw: number, profile: ClassProfile, attr: AttrKey): number {
  // LUCK is never a resource-formula input and canon forbids scaling it, even for
  // classes that list it as Prime/Core/Secondary (Gambler, Fatewright, …). Guard
  // here so display and formula share one LUCK rule.
  if (attr === 'LUCK') return raw;
  return Math.round(raw * getClassAttrMultiplier(profile, attr));
}

/**
 * The full §1 → final resource chain for the character sheet. Class influence
 * enters once, at the attribute layer, via `effectiveAttribute` — the same seam
 * the per-attribute cells display — so display and formula cannot diverge.
 */
export function computeResourceChain(input: ResourceChainInput): ResourceChain {
  const { attributes, profile, raceMod, conditionMods, soulMult } = input;

  const effectiveAttributes = {} as Attributes;
  for (const key of FORMULA_ATTRIBUTE_KEYS) {
    effectiveAttributes[key] = effectiveAttribute(attributes[key], profile, key);
  }

  const maxima = computeResourceMaxima(effectiveAttributes, 1.0);

  const finalResources = {} as FinalResources;
  for (const r of RESOURCE_KEYS) {
    const soul = r === 'Reserve' ? soulMult : 1;
    finalResources[r] = Math.round(maxima[r] * raceMod[r] * conditionMods[r] * soul);
  }

  const breakdowns: ResourceBreakdown[] = RESOURCE_KEYS.map((r) => ({
    resource: r,
    attributeValue: Math.round(maxima[r]),
    raceMod: raceMod[r],
    soulMultiplier: r === 'Reserve' ? soulMult : 1,
    conditionMod: conditionMods[r],
    final: finalResources[r],
  }));

  return { effectiveAttributes, maxima, finalResources, breakdowns };
}
