import { describe, it, expect } from 'vitest';
import {
  PUBLIC_ENV_ALIASES,
  REQUIRED_PUBLIC_IDS,
  resolvePublicEnv,
  missingPublicIds,
} from '../../scripts/lib/public-env.mjs';

/**
 * The Astro-era → Next-era rename. This used to live in three workflow files
 * and nowhere else, so a local `.env` with the Astro-era spelling resolved to
 * nothing while CI resolved both ids. These cases pin the rule that replaced
 * those three copies.
 */

describe('resolvePublicEnv', () => {
  it('falls back to the Astro-era Variable when the Next-era name is unset', () => {
    const resolved = resolvePublicEnv({ PUBLIC_GA4_ID: 'G-FROM-ASTRO' });
    expect(resolved.NEXT_PUBLIC_GA4_ID).toBe('G-FROM-ASTRO');
  });

  it('prefers the Next-era name when both are set', () => {
    const resolved = resolvePublicEnv({
      NEXT_PUBLIC_GA4_ID: 'G-WINS',
      PUBLIC_GA4_ID: 'G-LOSES',
    });
    expect(resolved.NEXT_PUBLIC_GA4_ID).toBe('G-WINS');
  });

  it('resolves a missing id to an empty string, never undefined', () => {
    // The deploy env ships bare `KEY=` lines, so callers use `|| default`
    // rather than `??`. Returning undefined here would break that contract.
    const resolved = resolvePublicEnv({});
    for (const name of Object.keys(PUBLIC_ENV_ALIASES)) {
      expect(resolved[name]).toBe('');
    }
  });

  it('trims surrounding whitespace so a padded Variable is not mistaken for a value', () => {
    expect(resolvePublicEnv({ PUBLIC_KIT_FORM_ID: '  9590915  ' }).NEXT_PUBLIC_KIT_FORM_ID).toBe(
      '9590915',
    );
    expect(resolvePublicEnv({ PUBLIC_KIT_FORM_ID: '   ' }).NEXT_PUBLIC_KIT_FORM_ID).toBe('');
  });

  it('covers every alias it declares', () => {
    const resolved = resolvePublicEnv({});
    expect(Object.keys(resolved).sort()).toEqual(Object.keys(PUBLIC_ENV_ALIASES).sort());
  });
});

describe('missingPublicIds', () => {
  it('reports nothing when both required ids resolve from Astro-era names', () => {
    expect(missingPublicIds({ PUBLIC_GA4_ID: 'G-X', PUBLIC_KIT_FORM_ID: '9590915' })).toEqual([]);
  });

  it('reports the Variable name, not the env name — that is what gets fixed', () => {
    expect(missingPublicIds({ PUBLIC_KIT_FORM_ID: '9590915' })).toEqual(['PUBLIC_GA4_ID']);
  });

  it('treats a whitespace-only Variable as missing', () => {
    expect(missingPublicIds({ PUBLIC_GA4_ID: '   ', PUBLIC_KIT_FORM_ID: '9590915' })).toEqual([
      'PUBLIC_GA4_ID',
    ]);
  });

  it('does not require the site URL — no Variable exists for it yet', () => {
    expect(REQUIRED_PUBLIC_IDS).not.toContain('NEXT_PUBLIC_SITE_URL');
    expect(missingPublicIds({ PUBLIC_GA4_ID: 'G-X', PUBLIC_KIT_FORM_ID: '9590915' })).toEqual([]);
  });
});
