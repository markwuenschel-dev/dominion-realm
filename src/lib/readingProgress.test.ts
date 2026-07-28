import { describe, it, expect } from 'vitest';
import {
  clampPart,
  clampScroll,
  clampPrefs,
  isResumable,
  parseProgress,
  parsePrefs,
  DEFAULT_PREFS,
  FONT_SCALE,
  LINE_HEIGHT,
  RESUME_MIN_PCT,
  RESUME_MAX_PCT,
} from './readingProgress';

/**
 * The pure persistence logic for the reader. The localStorage wrappers are thin
 * and exercised end-to-end; here we pin the clamp/parse contract that keeps a
 * corrupt or hostile stored value from ever reaching the UI.
 */
describe('clampPart', () => {
  it('clamps a 1-based part into range and floors/guards bad input', () => {
    expect(clampPart(2, 3)).toBe(2);
    expect(clampPart(0, 3)).toBe(1);
    expect(clampPart(9, 3)).toBe(3);
    expect(clampPart(2.7, 3)).toBe(2);
    expect(clampPart(NaN, 3)).toBe(1);
    expect(clampPart(2, 0)).toBe(1);
  });
});

describe('clampScroll', () => {
  it('clamps into [0, 1] and treats non-finite as 0', () => {
    expect(clampScroll(-0.5)).toBe(0);
    expect(clampScroll(1.7)).toBe(1);
    expect(clampScroll(0.42)).toBe(0.42);
    expect(clampScroll(NaN)).toBe(0);
  });
});

describe('clampPrefs', () => {
  it('defaults missing or non-finite values', () => {
    expect(clampPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(clampPrefs({})).toEqual(DEFAULT_PREFS);
    expect(clampPrefs({ fontScale: NaN, lineHeight: NaN })).toEqual(DEFAULT_PREFS);
  });

  it('clamps out-of-range values to the control bounds', () => {
    expect(clampPrefs({ fontScale: 5, lineHeight: 5 })).toEqual({
      fontScale: FONT_SCALE.max,
      lineHeight: LINE_HEIGHT.max,
    });
    expect(clampPrefs({ fontScale: 0.1, lineHeight: 0.1 })).toEqual({
      fontScale: FONT_SCALE.min,
      lineHeight: LINE_HEIGHT.min,
    });
  });

  it('passes in-range values through', () => {
    expect(clampPrefs({ fontScale: 1.1, lineHeight: 1.9 })).toEqual({
      fontScale: 1.1,
      lineHeight: 1.9,
    });
  });
});

describe('isResumable', () => {
  it('is true only for genuine mid-chapter progress', () => {
    expect(isResumable({ chapterId: 'x', scrollPct: 0.5 })).toBe(true);
    expect(isResumable({ chapterId: 'x', scrollPct: RESUME_MIN_PCT + 0.001 })).toBe(true);
    expect(isResumable({ chapterId: 'x', scrollPct: RESUME_MAX_PCT - 0.001 })).toBe(true);
  });

  it('is false at or below the lower bound (barely started)', () => {
    expect(isResumable({ chapterId: 'x', scrollPct: RESUME_MIN_PCT })).toBe(false);
    expect(isResumable({ chapterId: 'x', scrollPct: 0.01 })).toBe(false);
    expect(isResumable({ chapterId: 'x', scrollPct: 0 })).toBe(false);
  });

  it('is false at or above the upper bound (effectively finished)', () => {
    expect(isResumable({ chapterId: 'x', scrollPct: RESUME_MAX_PCT })).toBe(false);
    expect(isResumable({ chapterId: 'x', scrollPct: 0.97 })).toBe(false);
    expect(isResumable({ chapterId: 'x', scrollPct: 1 })).toBe(false);
  });
});

describe('parseProgress', () => {
  it('returns null for empty / malformed / incomplete input', () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress('')).toBeNull();
    expect(parseProgress('not json')).toBeNull();
    expect(parseProgress('{"scrollPct":0.5}')).toBeNull(); // no chapterId
    expect(parseProgress('"a string"')).toBeNull();
  });

  it('parses a valid record and clamps the scroll fraction', () => {
    expect(parseProgress('{"chapterId":"01-chapter-one","scrollPct":0.5}')).toEqual({
      chapterId: '01-chapter-one',
      scrollPct: 0.5,
    });
    expect(parseProgress('{"chapterId":"x","scrollPct":9}')).toEqual({
      chapterId: 'x',
      scrollPct: 1,
    });
    expect(parseProgress('{"chapterId":"x"}')).toEqual({ chapterId: 'x', scrollPct: 0 });
  });

  it('carries a later scene part, and omits it for part 1 / bad values', () => {
    expect(parseProgress('{"chapterId":"x","scrollPct":0.5,"part":3}')).toEqual({
      chapterId: 'x',
      scrollPct: 0.5,
      part: 3,
    });
    // part 1 is the base URL, so it is never persisted as a part.
    expect(parseProgress('{"chapterId":"x","scrollPct":0.5,"part":1}')).toEqual({
      chapterId: 'x',
      scrollPct: 0.5,
    });
    expect(parseProgress('{"chapterId":"x","scrollPct":0.5,"part":"2"}')).toEqual({
      chapterId: 'x',
      scrollPct: 0.5,
    });
  });
});

describe('parsePrefs', () => {
  it('falls back to defaults for empty / malformed input', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('not json')).toEqual(DEFAULT_PREFS);
  });

  it('parses and clamps stored prefs', () => {
    expect(parsePrefs('{"fontScale":1.2,"lineHeight":2.0}')).toEqual({
      fontScale: 1.2,
      lineHeight: 2.0,
    });
    expect(parsePrefs('{"fontScale":99,"lineHeight":99}')).toEqual({
      fontScale: FONT_SCALE.max,
      lineHeight: LINE_HEIGHT.max,
    });
  });
});
