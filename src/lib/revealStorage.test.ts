import { describe, it, expect, beforeEach } from 'vitest';
import { readReveal, writeReveal } from './revealStorage';
import { REVEAL_STORAGE_KEY } from './reveal';

/**
 * The reveal-level persistence seam, extracted from RevealProvider so the
 * parse/guard is pure and testable (mirrors the reading-progress wrappers).
 */
describe('readReveal / writeReveal', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a valid level through localStorage', () => {
    writeReveal('deep');
    expect(localStorage.getItem(REVEAL_STORAGE_KEY)).toBe('deep');
    expect(readReveal()).toBe('deep');
  });

  it('returns null when nothing is stored', () => {
    expect(readReveal()).toBeNull();
  });

  it('coerces an invalid stored value to the safe default rather than returning it', () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'not-a-tier');
    expect(readReveal()).toBe('teaser');
  });
});
