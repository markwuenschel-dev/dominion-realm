import { describe, it, expect } from 'vitest';
import {
  readingMinutes,
  getNeighbors,
  splitScenes,
  sceneCount,
  shouldPaginate,
  PAGINATE_WORD_THRESHOLD,
  parseLaterScenePart,
  readingSceneUrl,
  type ReadingEntry,
} from './reading';

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

describe('splitScenes / sceneCount', () => {
  const entry = (body: string): ReadingEntry =>
    ({ collection: 'reading', id: 'x', body, data: {} }) as unknown as ReadingEntry;

  it('splits on thematic-break lines and trims blanks', () => {
    const scenes = splitScenes('Scene one.\n\n---\n\nScene two.\n\n***\n\nScene three.');
    expect(scenes).toEqual(['Scene one.', 'Scene two.', 'Scene three.']);
    expect(sceneCount(entry('a\n---\nb'))).toBe(2);
  });

  it('returns a single scene when there are no breaks', () => {
    expect(splitScenes('Just prose, no breaks.')).toEqual(['Just prose, no breaks.']);
    expect(sceneCount(entry('Just prose.'))).toBe(1);
  });

  it('does not split on a triple-dash mid-line (only whole-line breaks)', () => {
    expect(splitScenes('a --- b')).toEqual(['a --- b']);
  });
});

describe('shouldPaginate', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');
  const entry = (body: string): ReadingEntry =>
    ({ collection: 'reading', id: 'x', body, data: {} }) as unknown as ReadingEntry;

  it('paginates only long, multi-scene pieces', () => {
    const long = `${words(PAGINATE_WORD_THRESHOLD)}\n---\nmore`;
    expect(shouldPaginate(entry(long))).toBe(true);
  });

  it('leaves a short multi-scene piece (the Prologue) as one page', () => {
    expect(shouldPaginate(entry('scene one\n---\nscene two'))).toBe(false);
  });

  it('never paginates a single-scene piece however long', () => {
    expect(shouldPaginate(entry(words(PAGINATE_WORD_THRESHOLD * 2)))).toBe(false);
  });
});

describe('parseLaterScenePart', () => {
  // HTTP ownership of scene-part validity (audit CAND-22): reject, don't clamp.
  // Part 1 is the canonical /read/<id> route; this parser only admits later parts.
  it('accepts an in-range later part', () => {
    expect(parseLaterScenePart('2', 3)).toBe(2);
    expect(parseLaterScenePart('3', 3)).toBe(3);
  });

  it('rejects part 1 (belongs on the canonical chapter URL)', () => {
    expect(parseLaterScenePart('1', 3)).toBeNull();
  });

  it('rejects out-of-range and non-integer segments', () => {
    expect(parseLaterScenePart('0', 3)).toBeNull();
    expect(parseLaterScenePart('4', 3)).toBeNull();
    expect(parseLaterScenePart('2.7', 3)).toBeNull();
    expect(parseLaterScenePart('abc', 3)).toBeNull();
  });
});

describe('readingSceneUrl', () => {
  it('keeps part 1 on the canonical chapter URL and suffixes later parts', () => {
    expect(readingSceneUrl('01-chapter-one', 1)).toBe('/read/01-chapter-one');
    expect(readingSceneUrl('01-chapter-one', 3)).toBe('/read/01-chapter-one/3');
  });
});
