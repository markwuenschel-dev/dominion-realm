// ─────────────────────────────────────────────────────────────────────────────
// types/characterSheet.test.ts
// The LUCK firewall as a structural invariant: the sheet attribute set is the
// formula set plus LUCK, and the formula set is the canonical ATTRIBUTE_KEYS.
// These arrays are now projected from one source, so this locks the projection.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { ATTRIBUTE_KEYS } from '@/types';
import { SHEET_ATTRIBUTE_KEYS, FORMULA_ATTRIBUTE_KEYS } from '@/types/characterSheet';

describe('attribute vocabulary — one source, projected', () => {
  it('FORMULA_ATTRIBUTE_KEYS is the canonical ATTRIBUTE_KEYS', () => {
    expect([...FORMULA_ATTRIBUTE_KEYS]).toEqual([...ATTRIBUTE_KEYS]);
  });

  it('SHEET = FORMULA + LUCK, in that order', () => {
    expect([...SHEET_ATTRIBUTE_KEYS]).toEqual([...FORMULA_ATTRIBUTE_KEYS, 'LUCK']);
  });

  it('LUCK is the sole sheet attribute outside the formula set', () => {
    const formula = new Set<string>(FORMULA_ATTRIBUTE_KEYS);
    const sheetOnly = SHEET_ATTRIBUTE_KEYS.filter((k) => !formula.has(k));
    expect(sheetOnly).toEqual(['LUCK']);
  });

  it('the sheet set has no duplicate keys', () => {
    expect(new Set(SHEET_ATTRIBUTE_KEYS).size).toBe(SHEET_ATTRIBUTE_KEYS.length);
  });
});
