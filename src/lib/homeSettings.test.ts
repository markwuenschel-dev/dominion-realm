import { describe, expect, it } from 'vitest';
import { parseHomeSettings } from './homeSettings';

/**
 * The Keystatic `home` singleton is the one CMS-produced file that used to cross
 * into the app without a schema gate (audit CAND-17). These tests pin the new
 * contract: legitimate states (empty object, unset cover) stay graceful, while
 * corrupt input — malformed JSON or a wrong-shaped document — throws loudly,
 * mirroring the Markdown collections' Zod behavior in content.ts.
 */
describe('parseHomeSettings', () => {
  it('accepts a valid document', () => {
    const parsed = parseHomeSettings(
      JSON.stringify({ coverImage: '/covers/book.png', coverAlt: 'Book cover' }),
      'home.json',
    );
    expect(parsed).toEqual({ coverImage: '/covers/book.png', coverAlt: 'Book cover' });
  });

  it('accepts an empty document (unset cover is a legitimate state)', () => {
    expect(parseHomeSettings('{}', 'home.json')).toEqual({});
  });

  it('accepts a document with only coverImage (alt falls back downstream)', () => {
    expect(parseHomeSettings(JSON.stringify({ coverImage: '/covers/book.png' }), 'home.json')).toEqual({
      coverImage: '/covers/book.png',
    });
  });

  it('throws on malformed JSON, naming the source file', () => {
    expect(() => parseHomeSettings('{ not json', 'home.json')).toThrowError(/home\.json/);
  });

  it('throws on a wrong-shaped document (coverImage must be a string)', () => {
    expect(() => parseHomeSettings(JSON.stringify({ coverImage: 42 }), 'home.json')).toThrowError(
      /home\.json/,
    );
  });

  it('throws when the document is not an object', () => {
    expect(() => parseHomeSettings('"just a string"', 'home.json')).toThrowError(/home\.json/);
  });
});
