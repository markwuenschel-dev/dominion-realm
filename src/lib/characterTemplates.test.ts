import { describe, it, expect } from 'vitest';
import { SPECIES_TEMPLATES, SOUL_LEVELS, DEFAULT_SOUL_LEVEL } from './characterTemplates';
import { getClassProfile } from './classTaxonomy';
import { computeSheetResources } from './formulas/resourceChain';
import type { CharacterSheetAttributes } from '@/types/characterSheet';

/**
 * characterTemplates.ts's own header comment makes a specific, checkable
 * claim: its raceMod tables "reproduce" the resource-maxima formula lock,
 * "pinned to baseline human all-5s (HP=50, Mana=50, Stamina=50, Reserve=40)".
 * Nothing previously verified that claim against the real formula chain
 * (audit RHA-03) -- a resources.ts coefficient drift, or an edit to
 * SPECIES_TEMPLATES.Human.raceMod, could silently invalidate the comment
 * with nothing to catch it.
 *
 * Runs the real end-to-end chain (computeSheetResources), not a bare
 * computeResourceMaxima call, because the bare formula doesn't touch this
 * module's raceMod field at all -- it would pass even if Human's raceMod
 * were wrong, so it wouldn't actually be testing this file's claim.
 *
 * Deliberately does NOT test the other 8 species' raceMod values: they are
 * author-chosen balance constants with no formula oracle to check them
 * against (the same accepted residual-risk class as RHA-11's single
 * asymmetric-vector coverage) -- asserting e.g. Elf.raceMod.HP === 0.8 would
 * just re-state the same hardcoded number, not prove anything.
 */

// computeSheetResources takes the full 11-key sheet attribute set (LUCK
// included, ignored by the resource-maxima formula but required by the type
// since it comes "straight from the store" on the real sheet).
const ALL_FIVES: CharacterSheetAttributes = {
  CON: 5,
  END: 5,
  STR: 5,
  AGI: 5,
  DEX: 5,
  INT: 5,
  WIS: 5,
  CHA: 5,
  CVN: 5,
  MYS: 5,
  LUCK: 5,
};

describe('characterTemplates — Human baseline claim', () => {
  it('reproduces the stated HP=50/Mana=50/Stamina=50/Reserve=40 baseline through the real resource chain', () => {
    const human = SPECIES_TEMPLATES.Human;
    const unclassed = getClassProfile('None'); // every attribute Neutral (x1.0)
    const commonMultiplier = SOUL_LEVELS.find((s) => s.key === DEFAULT_SOUL_LEVEL)!.multiplier;
    expect(commonMultiplier).toBe(1.0); // guards the fixture itself, not the claim under test

    const { finalResources } = computeSheetResources({
      attributes: ALL_FIVES,
      profile: unclassed,
      raceMod: human.raceMod,
      conditionMods: { HP: 1.0, Mana: 1.0, Stamina: 1.0, Reserve: 1.0 },
      soulMult: commonMultiplier,
    });

    expect(finalResources).toEqual({ HP: 50, Mana: 50, Stamina: 50, Reserve: 40 });
  });
});
