import { describe, it, expect } from 'vitest';
import {
  REVEAL_TIERS,
  DEFAULT_TIER,
  rankOf,
  isRevealed,
  isUngated,
  isRevealTier,
  parseTier,
  stripGatedSections,
  projectByReveal,
  sealedLabel,
  sealedPrompt,
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

describe('stripGatedSections', () => {
  it('drops an above-teaser gate and its spoiler prose, keeping the surrounding text', () => {
    const mdx = [
      'Teaser-safe opening.',
      '<RevealGate tier="deep">',
      'He dies and comes back.',
      '</RevealGate>',
      'Teaser-safe closing.',
    ].join('\n\n');
    const stripped = stripGatedSections(mdx);
    expect(stripped).toContain('Teaser-safe opening.');
    expect(stripped).toContain('Teaser-safe closing.');
    expect(stripped).not.toContain('dies');
    expect(stripped).not.toContain('RevealGate');
  });

  it('removes every gate regardless of tier or attributes', () => {
    const mdx =
      '<RevealGate tier="reader" label="later">A</RevealGate> keep <RevealGate tier="deep">B</RevealGate>';
    const stripped = stripGatedSections(mdx);
    expect(stripped).not.toContain('A');
    expect(stripped).not.toContain('B');
    expect(stripped).toContain('keep');
  });

  it('leaves gate-free prose untouched', () => {
    const plain = 'Just ordinary teaser prose, no gates here.';
    expect(stripGatedSections(plain)).toBe(plain);
  });

  it('strips inline <Reveal> spans, keeping surrounding text', () => {
    const stripped = stripGatedSections('Serra <Reveal tier="deep">severs the bond</Reveal> here.');
    expect(stripped).not.toContain('severs');
    expect(stripped).not.toContain('Reveal');
    expect(stripped).toContain('Serra');
    expect(stripped).toContain('here.');
  });

  it('strips an inline <Reveal> nested inside a <RevealGate> block without leaking', () => {
    const mdx = [
      'Open teaser text.',
      '<RevealGate tier="reader">',
      'Reader prose with a <Reveal tier="deep">deep secret</Reveal> inside it.',
      '</RevealGate>',
      'Closing teaser text.',
    ].join('\n\n');
    const stripped = stripGatedSections(mdx);
    expect(stripped).toContain('Open teaser text.');
    expect(stripped).toContain('Closing teaser text.');
    expect(stripped).not.toContain('deep secret');
    expect(stripped).not.toContain('Reader prose');
    // No dangling tag fragments survive either pass.
    expect(stripped).not.toMatch(/Reveal/);
  });
});

describe('projectByReveal', () => {
  const items = [
    { id: 'a', reveal: 'teaser' as const },
    { id: 'b', reveal: 'reader' as const },
    { id: 'c', reveal: 'deep' as const },
  ];
  const show = (i: (typeof items)[number]) => ({ kind: 'shown' as const, id: i.id });
  const seal = (i: (typeof items)[number]) => ({ kind: 'sealed' as const, id: i.id });

  it('shows items at or below the level and seals those above', () => {
    const out = projectByReveal(items, 'reader', show, seal);
    expect(out.map((o) => o.kind)).toEqual(['shown', 'shown', 'sealed']);
  });

  it('at teaser only teaser items are shown', () => {
    const out = projectByReveal(items, 'teaser', show, seal);
    expect(out.map((o) => o.kind)).toEqual(['shown', 'sealed', 'sealed']);
  });

  it('a beyond reader sees everything', () => {
    const out = projectByReveal(items, 'beyond', show, seal);
    expect(out.every((o) => o.kind === 'shown')).toBe(true);
  });
});

describe('sealedLabel / sealedPrompt — one home for the sealed-surface copy', () => {
  it('formats the canonical "Sealed · <Tier>" chip with the display-cased tier', () => {
    expect(sealedLabel('deep')).toBe('Sealed · Deep');
    expect(sealedLabel('beyond')).toBe('Sealed · Beyond');
  });

  it('prompts the reader to raise their level to the display-cased tier', () => {
    expect(sealedPrompt('reader')).toBe('Raise your reveal level to Reader to read this.');
  });
});
