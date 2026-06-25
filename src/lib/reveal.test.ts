import { describe, it, expect } from 'vitest';
import {
  REVEAL_TIERS,
  DEFAULT_TIER,
  rankOf,
  isRevealed,
  isUngated,
  isRevealTier,
  parseTier,
} from './reveal';

/**
 * The reveal model is the project's single source of spoiler-control logic
 * (ADR-0004) and is pure/dependency-free — so it gets the most thorough unit
 * coverage. These tests pin the cumulative gating contract the schema, toggle
 * UI, and <RevealGate> all defer to.
 */

describe('rankOf', () => {
  it('ranks the four tiers in ascending spoiler order', () => {
    expect(REVEAL_TIERS.map(rankOf)).toEqual([0, 1, 2, 3]);
  });

  it('orders teaser < reader < deep < beyond', () => {
    expect(rankOf('teaser')).toBeLessThan(rankOf('reader'));
    expect(rankOf('reader')).toBeLessThan(rankOf('deep'));
    expect(rankOf('deep')).toBeLessThan(rankOf('beyond'));
  });
});

describe('isRevealed', () => {
  it('shows content at or below the reader’s level (cumulative)', () => {
    // A Deep reader sees teaser, reader, and deep content...
    expect(isRevealed('teaser', 'deep')).toBe(true);
    expect(isRevealed('reader', 'deep')).toBe(true);
    expect(isRevealed('deep', 'deep')).toBe(true);
    // ...but not Beyond content.
    expect(isRevealed('beyond', 'deep')).toBe(false);
  });

  it('hides everything above teaser from the default reader', () => {
    expect(isRevealed('teaser', 'teaser')).toBe(true);
    expect(isRevealed('reader', 'teaser')).toBe(false);
    expect(isRevealed('deep', 'teaser')).toBe(false);
    expect(isRevealed('beyond', 'teaser')).toBe(false);
  });

  it('a Beyond reader sees every tier', () => {
    for (const tier of REVEAL_TIERS) {
      expect(isRevealed(tier, 'beyond')).toBe(true);
    }
  });
});

describe('isUngated', () => {
  it('treats only the teaser baseline as ungated', () => {
    expect(isUngated('teaser')).toBe(true);
    expect(isUngated('reader')).toBe(false);
    expect(isUngated('deep')).toBe(false);
    expect(isUngated('beyond')).toBe(false);
  });

  it('agrees with the spoiler-safe default tier', () => {
    expect(isUngated(DEFAULT_TIER)).toBe(true);
    // Exactly the rank-0 tier is ungated.
    for (const tier of REVEAL_TIERS) {
      expect(isUngated(tier)).toBe(rankOf(tier) === 0);
    }
  });
});

describe('isRevealTier', () => {
  it('accepts the four canonical tiers', () => {
    for (const tier of REVEAL_TIERS) {
      expect(isRevealTier(tier)).toBe(true);
    }
  });

  it('rejects junk, wrong casing, and non-strings', () => {
    const junk: unknown[] = ['Teaser', 'spoiler', '', null, undefined, 0, 3, {}, ['deep']];
    for (const value of junk) {
      expect(isRevealTier(value)).toBe(false);
    }
  });
});

describe('parseTier', () => {
  it('passes through valid tiers unchanged', () => {
    for (const tier of REVEAL_TIERS) {
      expect(parseTier(tier)).toBe(tier);
    }
  });

  it('falls back to the safe default for untrusted input and never throws', () => {
    const junk: unknown[] = ['', 'DEEP', null, undefined, 42, {}, []];
    for (const value of junk) {
      expect(() => parseTier(value)).not.toThrow();
      expect(parseTier(value)).toBe(DEFAULT_TIER);
    }
  });

  it('defaults to the spoiler-safe teaser tier', () => {
    expect(DEFAULT_TIER).toBe('teaser');
  });
});
