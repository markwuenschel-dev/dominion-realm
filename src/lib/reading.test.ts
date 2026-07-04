import { describe, it, expect } from 'vitest';
import { readingMinutes, getNeighbors, type ReadingEntry } from './reading';

/**
 * Reading-sample helpers. `readingMinutes` backs the "~N min" cue on the index
 * and the reader header; `getNeighbors` drives prev/next chapter nav.
 */
describe('readingMinutes', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

  it('rounds up to whole minutes at ~230 wpm', () => {
    expect(readingMinutes(words(230))).toBe(1);
    expect(readingMinutes(words(231))).toBe(2);
    expect(readingMinutes(words(460))).toBe(2);
    expect(readingMinutes(words(500))).toBe(3);
  });

  it('never returns less than 1, even for empty prose', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('   \n  ')).toBe(1);
    expect(readingMinutes('one two three')).toBe(1);
  });

  it('honors a custom wpm', () => {
    expect(readingMinutes(words(300), 100)).toBe(3);
  });
});

describe('getNeighbors', () => {
  const entry = (id: string, order: number): ReadingEntry =>
    ({ collection: 'reading', id, body: '', data: { order } }) as unknown as ReadingEntry;
  const list = [entry('a', 0), entry('b', 1), entry('c', 2)];

  it('resolves prev/next within the ordered list', () => {
    expect(getNeighbors(list, 'b')).toEqual({ prev: list[0], next: list[2] });
  });

  it('leaves ends open', () => {
    expect(getNeighbors(list, 'a').prev).toBeUndefined();
    expect(getNeighbors(list, 'c').next).toBeUndefined();
  });

  it('returns empty for an unknown id', () => {
    expect(getNeighbors(list, 'zzz')).toEqual({});
  });
});
