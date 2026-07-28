// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCharacterSheet.test.tsx
// Two guards on the sheet's derived values:
//   1. §1 formula lock — attribute resources must come from computeResourceMaxima.
//   2. Golden master — default-state derived output is bit-identical (behaviour
//      preservation for the §1/§7 deepening onto lib/formulas).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacterSheet } from './useCharacterSheet';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { computeResourceMaxima } from '@/lib/formulas/resources';
import { computeActivityRegenRates } from '@/lib/formulas/activityRegen';
import type { CharacterSheetAttributes } from '@/types/characterSheet';

/**
 * The resource-maxima formula is the project's "formula lock". It is owned and
 * tested in `formulas/resources.ts`. The character sheet must derive its
 * per-attribute resource values from that same seam — not re-encode the arithmetic — so the
 * sheet and the calculator provably agree. These tests pin that equivalence: the sheet's
 * `breakdown.attributeValue` must equal `computeResourceMaxima(attrs, 1.0)` for every resource.
 * If the hook ever drifts back to a private inline formula, this goes red.
 */

const RESOURCES = ['HP', 'Mana', 'Stamina', 'Reserve'] as const;

function attributeValues(breakdowns: ReturnType<typeof useCharacterSheet>['breakdowns']) {
  return Object.fromEntries(breakdowns.map((b) => [b.resource, b.attributeValue])) as Record<
    (typeof RESOURCES)[number],
    number
  >;
}

afterEach(() => {
  useCharacterSheetStore.getState().resetToDefaults();
});

describe('useCharacterSheet — §1 resource formula lock', () => {
  it('derives default-state attribute resources from computeResourceMaxima', () => {
    const { result } = renderHook(() => useCharacterSheet());
    const attrs = useCharacterSheetStore.getState().attributes;
    const expected = computeResourceMaxima(attrs, 1.0);

    const actual = attributeValues(result.current.breakdowns);
    for (const r of RESOURCES) {
      expect(actual[r]).toBe(expected[r]);
    }

    // Concrete lock: all attributes at species-minimum 5.
    expect(actual).toEqual({ HP: 50, Mana: 50, Stamina: 50, Reserve: 40 });
  });

  it('stays equal to computeResourceMaxima after attributes change', () => {
    const mutated: CharacterSheetAttributes = {
      CON: 12,
      END: 8,
      STR: 7,
      AGI: 6,
      DEX: 9,
      INT: 14,
      WIS: 11,
      CHA: 4,
      CVN: 3,
      MYS: 5,
      LUCK: 10,
    };

    const { result } = renderHook(() => useCharacterSheet());
    act(() => {
      useCharacterSheetStore.getState().loadState({ attributes: mutated });
    });

    const expected = computeResourceMaxima(mutated, 1.0);
    const actual = attributeValues(result.current.breakdowns);
    for (const r of RESOURCES) {
      expect(actual[r]).toBe(expected[r]);
    }

    // Hand-computed lock — LUCK (10) is tracked but must not affect any resource.
    expect(actual).toEqual({ HP: 102, Mana: 121, Stamina: 86, Reserve: 70 });
  });
});

describe('useCharacterSheet — class influence rounds once at the attribute layer', () => {
  it('derives a classed character from rounded effective attributes (display == formula)', () => {
    const { result } = renderHook(() => useCharacterSheet());
    act(() => {
      useCharacterSheetStore.getState().loadState({
        className: 'Warrior', // STR/END Prime ×1.15, CON/AGI/DEX Core ×1.08, WIS/CVN Secondary
        attributes: {
          CON: 10,
          END: 10,
          STR: 10,
          AGI: 10,
          DEX: 10,
          INT: 10,
          WIS: 10,
          CHA: 10,
          CVN: 10,
          MYS: 10,
          LUCK: 10,
        },
      });
    });

    // Round once per attribute BEFORE the §1 formula: Prime→12, Core→11, Secondary/Neutral→10.
    // HP = 6·11 + 2·12 + 2·12 = 114. The old unrounded path gave 111 — this pins the fix.
    const actual = attributeValues(result.current.breakdowns);
    expect(actual).toEqual({ HP: 114, Mana: 100, Stamina: 116, Reserve: 86 });
  });

  /**
   * §7 regen was the last seam still reading RAW store attributes while the sheet
   * displayed effective ones (deferred out of the Wave 1 attribute-view refactor).
   * A default-state fixture cannot see that: the store defaults `className: 'None'`,
   * Unclassed declares no roles, so every multiplier is 1.0 and raw ≡ effective. This
   * fixture is classed on purpose — the first assertion asserts the divergence exists,
   * so the test can never quietly decay back into proving nothing.
   */
  it('computes §7 regen from effective attributes, not raw store values', () => {
    const { result } = renderHook(() => useCharacterSheet());
    act(() => {
      useCharacterSheetStore.getState().loadState({
        className: 'Warrior', // END Prime ×1.15 → 12, CON Core ×1.08 → 11, WIS Secondary ×1.03 → 10
        attributes: {
          CON: 10,
          END: 10,
          STR: 10,
          AGI: 10,
          DEX: 10,
          INT: 10,
          WIS: 10,
          CHA: 10,
          CVN: 10,
          MYS: 10,
          LUCK: 10,
        },
      });
    });

    const views = result.current.attributeViews;

    // Fixture-reachability guard: if these ever collapse to equal, the assertions
    // below stop discriminating and this test must be re-fixtured, not deleted.
    expect(views.END.effective).toBe(12);
    expect(views.END.raw).toBe(10);
    expect(views.CON.effective).toBe(11);
    expect(views.CON.raw).toBe(10);

    // Structural lock: regen reads the same per-attribute record the cells display.
    expect(result.current.regenRates).toEqual(
      computeActivityRegenRates(result.current.finalResources, {
        CON: views.CON.effective,
        END: views.END.effective,
        WIS: views.WIS.effective,
      }),
    );

    // Concrete pins on the two tiers carrying a flat attribute term that diverges.
    // Stamina.fullRest = round2(116 × 0.12 + END/2): effective 12 → 19.92; raw 10 gave 18.92.
    // HP.safeRest      = round2(114 × 0.03 + CON/2): effective 11 →  8.92; raw 10 gave  8.42.
    expect(result.current.regenRates.Stamina.fullRest).toBe(19.92);
    expect(result.current.regenRates.HP.safeRest).toBe(8.92);

    // WIS is Secondary for Warrior: ×1.03 rounds 10 back to 10, so the Mana/Reserve
    // terms are legitimately unchanged here — they are not evidence either way.
    expect(views.WIS.effective).toBe(views.WIS.raw);
  });
});

describe('useCharacterSheet — derived values (default state golden master)', () => {
  it('finalResources match the locked default output', () => {
    const { result } = renderHook(() => useCharacterSheet());
    expect(result.current.finalResources).toMatchInlineSnapshot(`
      {
        "HP": 50,
        "Mana": 50,
        "Reserve": 40,
        "Stamina": 50,
      }
    `);
  });

  it('breakdowns match the locked default output', () => {
    const { result } = renderHook(() => useCharacterSheet());
    expect(result.current.breakdowns).toMatchInlineSnapshot(`
      [
        {
          "attributeValue": 50,
          "conditionMod": 1,
          "final": 50,
          "raceMod": 1,
          "resource": "HP",
          "soulMultiplier": 1,
        },
        {
          "attributeValue": 50,
          "conditionMod": 1,
          "final": 50,
          "raceMod": 1,
          "resource": "Mana",
          "soulMultiplier": 1,
        },
        {
          "attributeValue": 50,
          "conditionMod": 1,
          "final": 50,
          "raceMod": 1,
          "resource": "Stamina",
          "soulMultiplier": 1,
        },
        {
          "attributeValue": 40,
          "conditionMod": 1,
          "final": 40,
          "raceMod": 1,
          "resource": "Reserve",
          "soulMultiplier": 1,
        },
      ]
    `);
  });

  it('regenRates (§7 activity-based) match the locked default output', () => {
    const { result } = renderHook(() => useCharacterSheet());
    expect(result.current.regenRates).toMatchInlineSnapshot(`
      {
        "HP": {
          "activeTravel": 0.25,
          "combat": 0,
          "lightRest": 2,
          "safeRest": 4,
        },
        "Mana": {
          "activeTravel": 0.5,
          "calmNoncombat": 1.5,
          "combat": 0.25,
          "meditation": 3.5,
        },
        "Reserve": {
          "activeTravel": 0.4,
          "combat": 0,
          "deepSleep": 4.45,
          "meditation": 3,
          "ordinaryRest": 1.2,
        },
        "Stamina": {
          "catchingBreath": 5.67,
          "combat": 0.5,
          "fullRest": 8.5,
          "lightMovement": 1.5,
        },
      }
    `);
  });
});
