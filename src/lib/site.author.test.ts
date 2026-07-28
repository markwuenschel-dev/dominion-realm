import { describe, it, expect } from 'vitest';
import { SITE, authorIsNamed } from './site';

/**
 * The byline predicate.
 *
 * Context worth keeping: `SiteConfig.author`'s docstring used to say the value
 * was a placeholder. It was not — the configured name is real, and two separate
 * planning passes mis-read the comment as the state of the site. The rule now
 * has one owner and a test, so the question "does this site have an author?" is
 * answered by the value rather than by prose about it.
 */
describe('authorIsNamed', () => {
  it('treats a bracketed stand-in as unnamed', () => {
    const original = SITE.author;
    try {
      SITE.author = '[Author Name]';
      expect(authorIsNamed()).toBe(false);
      SITE.author = '  [Pending]  ';
      expect(authorIsNamed()).toBe(false);
    } finally {
      SITE.author = original;
    }
  });

  it('treats an empty name as unnamed', () => {
    const original = SITE.author;
    try {
      SITE.author = '';
      expect(authorIsNamed()).toBe(false);
    } finally {
      SITE.author = original;
    }
  });

  it('treats an ordinary name as named', () => {
    const original = SITE.author;
    try {
      SITE.author = 'Ursula K. Le Guin';
      expect(authorIsNamed()).toBe(true);
    } finally {
      SITE.author = original;
    }
  });

  it('reports the shipped configuration as named', () => {
    // Guards the live value: if the byline is ever reverted to a stand-in, the
    // metadata in layout.tsx must stop emitting it, and this turns red first.
    expect(authorIsNamed()).toBe(true);
    expect(SITE.author.trim().length).toBeGreaterThan(0);
  });
});
