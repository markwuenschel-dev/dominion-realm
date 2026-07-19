import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_BASELINE } from '@/lib/formulas/pointBudget';
import { parseSheetImport } from './sheetImport';

/**
 * The sheet's JSON import is the one external-input path into the persisted
 * store (audit CAND-10). Contract (grilled): hybrid semantics — wrong shapes and
 * types reject the file, merely out-of-range numbers clamp to the setters'
 * ranges (level 1–50, attributes 1–30, currentXP ≥ 0). Unknown top-level keys
 * are stripped so junk never reaches loadState.
 */

const validAttributes = {
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
};

describe('parseSheetImport', () => {
  it('accepts a full valid export', () => {
    const parsed = parseSheetImport({
      name: 'Marcus',
      level: 12,
      species: 'Human',
      className: 'Gambler',
      soulLevel: 'Common',
      attributes: validAttributes,
      conditionMods: { HP: 1, Mana: 1, Stamina: 1, Reserve: 1 },
      currentXP: 300,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('Marcus');
    expect(parsed?.attributes?.CON).toBe(10);
  });

  it('accepts a partial document (loadState fills defaults)', () => {
    const parsed = parseSheetImport({ name: 'Just a name' });
    expect(parsed).toEqual({ name: 'Just a name' });
  });

  it('clamps out-of-range numbers to setter semantics', () => {
    const parsed = parseSheetImport({
      level: 999,
      attributes: { ...validAttributes, CON: 45, END: 0 },
      currentXP: -5,
    });
    expect(parsed?.level).toBe(50);
    expect(parsed?.attributes?.CON).toBe(30);
    expect(parsed?.attributes?.END).toBe(1);
    expect(parsed?.currentXP).toBe(0);
  });

  it('strips unknown top-level keys so junk never reaches the store', () => {
    const parsed = parseSheetImport({ name: 'X', evilPayload: { hack: true } });
    expect(parsed).toEqual({ name: 'X' });
  });

  it('rejects a string where a number belongs', () => {
    expect(parseSheetImport({ attributes: { ...validAttributes, CON: '99' } })).toBeNull();
  });

  it('rejects non-finite numbers', () => {
    expect(parseSheetImport({ level: Infinity })).toBeNull();
  });

  it('rejects an unknown species', () => {
    expect(parseSheetImport({ species: 'Dragon' })).toBeNull();
  });

  it('rejects an unknown soul level', () => {
    expect(parseSheetImport({ soulLevel: 'Mythic' })).toBeNull();
  });

  it('accepts any className string (open, data-driven key with profile fallback)', () => {
    expect(parseSheetImport({ className: 'Some Future Class' })).toEqual({
      className: 'Some Future Class',
    });
  });

  it('rejects an attributes block missing keys (e.g. a Faith/Occult-era export)', () => {
    const { CVN: _cvn, MYS: _mys, ...oldShape } = validAttributes;
    expect(parseSheetImport({ attributes: { ...oldShape, Faith: 10, Occult: 10 } })).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(parseSheetImport('"a string"')).toBeNull();
    expect(parseSheetImport(null)).toBeNull();
    expect(parseSheetImport([1, 2, 3])).toBeNull();
  });

  it('keeps baseline-valued attributes intact (no accidental re-defaulting)', () => {
    const attrs = Object.fromEntries(
      Object.keys(validAttributes).map((k) => [k, ATTRIBUTE_BASELINE]),
    );
    const parsed = parseSheetImport({ attributes: attrs });
    expect(parsed?.attributes?.LUCK).toBe(ATTRIBUTE_BASELINE);
  });
});
