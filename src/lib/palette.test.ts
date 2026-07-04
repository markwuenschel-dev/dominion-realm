// ─────────────────────────────────────────────────────────────────────────────
// lib/palette.test.ts
// The palette is the single home for the sheet/calculator colours. Record<Key, …>
// already enforces exhaustive keys at compile time; these assertions add what the
// type can't — that every entry is a non-empty class string (no blank slots) and
// that the two rarity maps stay in lockstep over the same rarity set.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  RESOURCE_COLORS,
  RARITY_COLORS,
  RARITY_TEXT_COLORS,
  SOUL_LEVEL_TEXT_COLORS,
} from './palette';
import { RESOURCE_KEYS } from '@/types';
import { SOUL_LEVELS } from './characterTemplates';
import { classesByRarity } from './classTaxonomy';

const RARITIES = Object.keys(classesByRarity);

describe('RESOURCE_COLORS', () => {
  it('gives every resource a full, non-empty colour set', () => {
    for (const key of RESOURCE_KEYS) {
      const c = RESOURCE_COLORS[key];
      expect(c, `missing colours for ${key}`).toBeDefined();
      expect(c.bg && c.text && c.border).toBeTruthy();
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('rarity colour maps', () => {
  it('both cover the full rarity set with non-empty classes', () => {
    for (const rarity of RARITIES) {
      expect(RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]).toBeTruthy();
      expect(RARITY_TEXT_COLORS[rarity as keyof typeof RARITY_TEXT_COLORS]).toBeTruthy();
    }
  });

  it('stay in lockstep over the same keys', () => {
    expect(Object.keys(RARITY_COLORS).sort()).toEqual(Object.keys(RARITY_TEXT_COLORS).sort());
  });
});

describe('SOUL_LEVEL_TEXT_COLORS', () => {
  it('colours every soul level', () => {
    for (const level of SOUL_LEVELS) {
      expect(SOUL_LEVEL_TEXT_COLORS[level.key], `missing colour for ${level.key}`).toBeTruthy();
    }
  });
});
