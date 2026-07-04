// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/resourceChain.test.ts
// The effective-attribute seam: one place a raw attribute becomes its effective
// (class-scaled, rounded-once) value — driving BOTH the display and the §1
// resource formulas so the two can never disagree.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { effectiveAttribute, computeResourceChain } from './resourceChain';
import { computeResourceMaxima } from './resources';
import { getClassProfile } from '@/lib/classTaxonomy';
import { FORMULA_ATTRIBUTE_KEYS } from '@/types/characterSheet';
import type { CharacterSheetAttributes } from '@/types/characterSheet';

const NO_MOD = { HP: 1, Mana: 1, Stamina: 1, Reserve: 1 };

function attrs(fill: number): CharacterSheetAttributes {
  return {
    CON: fill,
    END: fill,
    STR: fill,
    AGI: fill,
    DEX: fill,
    INT: fill,
    WIS: fill,
    CHA: fill,
    CVN: fill,
    MYS: fill,
    LUCK: fill,
  };
}

describe('effectiveAttribute — round once at the attribute layer', () => {
  it('scales a Prime attribute by ×1.15 and rounds to an integer', () => {
    const warrior = getClassProfile('Warrior'); // STR is Prime (×1.15)
    // 10 × 1.15 = 11.5 → 12. One integer, used by display AND formula.
    expect(effectiveAttribute(10, warrior, 'STR')).toBe(12);
  });

  it('never scales LUCK, even when a class lists it as Prime (canon firewall)', () => {
    const gambler = getClassProfile('Gambler'); // LUCK is Prime — must NOT scale
    expect(effectiveAttribute(10, gambler, 'LUCK')).toBe(10);
  });

  it('returns the raw value unchanged for a Neutral / Unclassed attribute', () => {
    const unclassed = getClassProfile('None'); // every multiplier ×1.0
    expect(effectiveAttribute(13, unclassed, 'STR')).toBe(13);
  });
});

describe('computeResourceChain — round once, then feed the §1 formulas', () => {
  const warrior = getClassProfile('Warrior');

  it('derives maxima from the rounded effective attributes (display == formula)', () => {
    const chain = computeResourceChain({
      attributes: attrs(10),
      profile: warrior,
      raceMod: NO_MOD,
      conditionMods: NO_MOD,
      soulMult: 1,
    });

    // Agreement: every effective attribute equals the primitive both callers share.
    for (const k of FORMULA_ATTRIBUTE_KEYS) {
      expect(chain.effectiveAttributes[k]).toBe(effectiveAttribute(10, warrior, k));
    }

    // Maxima come from those rounded effective attrs — not the raw or unrounded ones.
    expect(chain.maxima).toEqual(computeResourceMaxima(chain.effectiveAttributes, 1.0));

    // Hand-computed lock (Warrior, all 10): Prime→12, Core→11, Secondary/Neutral→10.
    // HP = 6·11 + 2·12 + 2·12 = 114 (the OLD unrounded path gave 111 — this is the fix).
    expect(chain.maxima).toEqual({ HP: 114, Mana: 100, Stamina: 116, Reserve: 86 });
    expect(chain.finalResources).toEqual({ HP: 114, Mana: 100, Stamina: 116, Reserve: 86 });
  });

  it('applies race × condition to all resources and soul × to Reserve only, rounding final', () => {
    const chain = computeResourceChain({
      attributes: attrs(10),
      profile: warrior,
      raceMod: { HP: 1.1, Mana: 1, Stamina: 1, Reserve: 1.2 },
      conditionMods: { HP: 0.9, Mana: 1, Stamina: 1, Reserve: 1 },
      soulMult: 1.5,
    });

    // HP = round(114 × 1.1 × 0.9) = round(112.86) = 113; Reserve = round(86 × 1.5 × 1.2) = 155.
    expect(chain.finalResources.HP).toBe(113);
    expect(chain.finalResources.Reserve).toBe(155);
    expect(chain.finalResources.Mana).toBe(100);

    const reserve = chain.breakdowns.find((b) => b.resource === 'Reserve')!;
    expect(reserve).toEqual({
      resource: 'Reserve',
      attributeValue: 86,
      raceMod: 1.2,
      soulMultiplier: 1.5,
      conditionMod: 1,
      final: 155,
    });
  });
});
