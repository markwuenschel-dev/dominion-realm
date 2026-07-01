import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacterSheet } from './useCharacterSheet';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { computeResourceMaxima } from '@/lib/formulas/resources';
import type { CharacterSheetAttributes } from '@/types/characterSheet';

/**
 * The §1 resource-maxima formula is the project's "formula lock" (resource_system.md §1).
 * It is owned and tested in `formulas/resources.ts`. The character sheet must derive its
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
      Faith: 3,
      Occult: 5,
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
