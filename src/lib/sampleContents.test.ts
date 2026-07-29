import { describe, it, expect } from 'vitest';
import {
  entryPhrase,
  sampleContentsPhrase,
  sampleSubtitle,
} from '../../scripts/lib/sample-doc.mjs';

/**
 * The sentences describing the sample used to be five hardcoded literals while
 * page counts, routes, and both downloads all derived from files on disk. These
 * cases pin the derivation that replaced them — especially the growth cases,
 * since the whole point is that adding a chapter strands nothing.
 */

const PROLOGUE = { kind: 'prologue', order: 0 };
const CH1 = { kind: 'chapter', order: 1 };
const CH2 = { kind: 'chapter', order: 2 };
const CH3 = { kind: 'chapter', order: 3 };

describe('entryPhrase', () => {
  it('names a prologue by kind and a chapter by spelled-out order', () => {
    expect(entryPhrase(PROLOGUE)).toBe('Prologue');
    expect(entryPhrase(CH1)).toBe('Chapter One');
    expect(entryPhrase(CH2)).toBe('Chapter Two');
  });

  it('falls back to digits past the spelled-out range rather than throwing', () => {
    expect(entryPhrase({ kind: 'chapter', order: 40 })).toBe('Chapter 40');
  });
});

describe('sampleContentsPhrase', () => {
  it('reproduces the copy it replaced, for the content that exists today', () => {
    expect(sampleContentsPhrase([PROLOGUE, CH1])).toBe('the Prologue and Chapter One');
    expect(sampleContentsPhrase([PROLOGUE, CH1], { article: false, conjunction: '&' })).toBe(
      'Prologue & Chapter One',
    );
  });

  it('grows correctly when a chapter is added — the reason this exists', () => {
    expect(sampleContentsPhrase([PROLOGUE, CH1, CH2])).toBe(
      'the Prologue, Chapter One and Chapter Two',
    );
    expect(sampleContentsPhrase([PROLOGUE, CH1, CH2, CH3])).toBe(
      'the Prologue, Chapter One, Chapter Two and Chapter Three',
    );
  });

  it('sorts by order rather than trusting the argument order', () => {
    expect(sampleContentsPhrase([CH2, PROLOGUE, CH1])).toBe(
      'the Prologue, Chapter One and Chapter Two',
    );
  });

  it('omits the article when the sample does not open on a prologue', () => {
    expect(sampleContentsPhrase([CH1, CH2])).toBe('Chapter One and Chapter Two');
  });

  it('handles a single entry without a dangling conjunction', () => {
    expect(sampleContentsPhrase([PROLOGUE])).toBe('the Prologue');
    expect(sampleContentsPhrase([CH1])).toBe('Chapter One');
  });

  it('returns an empty string for no entries rather than a broken sentence', () => {
    expect(sampleContentsPhrase([])).toBe('');
  });
});

describe('sampleSubtitle', () => {
  it('matches the literal it replaced — this string is baked into files readers keep', () => {
    expect(sampleSubtitle([PROLOGUE, CH1])).toBe('The Reading Sample — Prologue & Chapter One');
  });

  it('tracks the bundled chapters', () => {
    expect(sampleSubtitle([PROLOGUE, CH1, CH2])).toBe(
      'The Reading Sample — Prologue, Chapter One & Chapter Two',
    );
  });

  it('degrades to a bare label rather than a trailing dash when nothing is bundled', () => {
    expect(sampleSubtitle([])).toBe('The Reading Sample');
  });
});
