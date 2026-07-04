import { describe, it, expect } from 'vitest';
import { xpToNextLevel, xpProgress, sceneXP } from './xpFormulas';
import type { ClassRarity } from '@/lib/classTaxonomy';

/**
 * Prevalence-derived XP model (xp_progression_formulas.md §§19–20). These pin the
 * published design anchors so a bad edit to D0/BETA or the prevalence ladder goes red.
 */

const PACED_RARITIES: ClassRarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Fabled',
  'Legendary',
  'Mythic',
];

describe('xpProgress — progress percent with the Unique/guard edges', () => {
  it('carries null through for the Unique tier (xpToNextLevel === null)', () => {
    expect(xpProgress(500, null)).toBeNull();
  });

  it('returns 0 when xpToNextLevel ≤ 0 (divide-by-zero guard)', () => {
    expect(xpProgress(50, 0)).toBe(0);
    expect(xpProgress(50, -10)).toBe(0);
  });

  it('rounds the ratio to a whole percent', () => {
    expect(xpProgress(2, 3)).toBe(67); // 66.6…% → 67 (round, not floor)
    expect(xpProgress(0, 100)).toBe(0);
  });

  it('clamps to [0, 100]', () => {
    expect(xpProgress(150, 100)).toBe(100); // over cap
    expect(xpProgress(-20, 100)).toBe(0); // below zero
  });
});

describe('xpToNextLevel — design anchors', () => {
  it('Level 1 threshold is exactly 100 for every paced rarity', () => {
    for (const rarity of PACED_RARITIES) {
      expect(xpToNextLevel(1, rarity)).toBeCloseTo(100, 6);
    }
  });

  it('Unclassed paces identically to Common', () => {
    for (const level of [1, 5, 20]) {
      expect(xpToNextLevel(level, 'Unclassed')).toBe(xpToNextLevel(level, 'Common'));
    }
  });

  it('matches the §5 table at Level 20 (Common ≈ 5216, Legendary ≈ 7198)', () => {
    expect(xpToNextLevel(20, 'Common')).toBeCloseTo(5216, 0);
    expect(xpToNextLevel(20, 'Legendary')).toBeCloseTo(7198, 0);
  });

  it('holds the Legendary/Common(20) = 1.38 anchor', () => {
    const ratio = xpToNextLevel(20, 'Legendary')! / xpToNextLevel(20, 'Common')!;
    expect(ratio).toBeCloseTo(1.38, 4);
  });

  it('rarer classes require at least as much XP per level (monotone in rarity)', () => {
    for (let i = 1; i < PACED_RARITIES.length; i++) {
      expect(xpToNextLevel(20, PACED_RARITIES[i]!)!).toBeGreaterThan(
        xpToNextLevel(20, PACED_RARITIES[i - 1]!)!,
      );
    }
  });
});

describe('xpToNextLevel — Unique guard', () => {
  it('returns null for Unique (N_cycle undefined) — never a fabricated number', () => {
    expect(xpToNextLevel(1, 'Unique')).toBeNull();
    expect(xpToNextLevel(20, 'Unique')).toBeNull();
  });
});

describe('sceneXP — saturation', () => {
  it('is 0 with no adaptive evidence and approaches the threshold as evidence grows', () => {
    expect(sceneXP(100, 0)).toBe(0);
    expect(sceneXP(100, 10)).toBeGreaterThan(99);
    expect(sceneXP(100, 10)).toBeLessThan(100);
  });
});
