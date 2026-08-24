import { afterEach, describe, expect, it, vi } from 'vitest';

import { keystaticAuthoringState, keystaticDisabledResponse } from './keystaticAccess';

/**
 * INT-07. The failure this suite exists to make unreachable was live in production
 * on 2026-08-24: `GET /api/keystatic/tree` with a `no-cors: 1` header returned HTTP
 * 200 and a full file inventory of the container, because the deploy env lacked
 * `NEXT_PUBLIC_KEYSTATIC_GITHUB` and Keystatic's storage mode fell back to `local`,
 * whose handler has no authentication.
 *
 * Every assertion below is written to FAIL if the gate ever reopens by default.
 * Each case sets `NODE_ENV=production` explicitly, because the whole hazard is a
 * production-only one — a dev machine's localhost is not publicly reachable, and
 * `pnpm dev` must keep its no-secrets local editor.
 */

const SECRETS = {
  KEYSTATIC_GITHUB_CLIENT_ID: 'id',
  KEYSTATIC_GITHUB_CLIENT_SECRET: 'secret',
  KEYSTATIC_SECRET: 'a'.repeat(32),
};

/** Put the process into the fully-authorized production shape, then let a test spoil one part. */
const authorizeProduction = (overrides: Record<string, string> = {}) => {
  const env: Record<string, string> = {
    KEYSTATIC_AUTHORING: 'true',
    NEXT_PUBLIC_KEYSTATIC_GITHUB: 'true',
    ...SECRETS,
    ...overrides,
  };
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('keystaticAuthoringState', () => {
  it('is open outside production, so local dev keeps its no-secrets editor', () => {
    // No opt-in, no flag, no secrets — the shape of every developer's machine.
    expect(keystaticAuthoringState({ nodeEnv: 'development' })).toEqual({
      enabled: true,
      reason: 'non-production',
    });
  });

  it('is SHUT in production when nothing is configured — the live 2026-08-24 state', () => {
    // Exactly the deploy env the probe found: four unrelated names, no Keystatic vars.
    expect(keystaticAuthoringState({ nodeEnv: 'production' })).toEqual({
      enabled: false,
      reason: 'not-opted-in',
    });
  });

  it('is SHUT when the public flag alone is set — storage mode is not authorization', () => {
    // The tempting one-step "fix": set the flag the config reads. It must not be enough,
    // because that flag is exactly what was missing when the handler was open.
    vi.stubEnv('NEXT_PUBLIC_KEYSTATIC_GITHUB', 'true');
    for (const [name, value] of Object.entries(SECRETS)) vi.stubEnv(name, value);
    expect(keystaticAuthoringState({ nodeEnv: 'production' })).toEqual({
      enabled: false,
      reason: 'not-opted-in',
    });
  });

  it('is SHUT when the two clocks disagree (server opted in, client bundle did not)', () => {
    // Repairing env_file without build.args: the server would authorize writes while
    // keystatic.config.ts still resolves `local` — authorizing the unauthenticated handler.
    authorizeProduction({ NEXT_PUBLIC_KEYSTATIC_GITHUB: '' });
    expect(keystaticAuthoringState({ nodeEnv: 'production' })).toEqual({
      enabled: false,
      reason: 'flags-disagree',
    });
  });

  it.each(Object.keys(SECRETS))('is SHUT when %s is missing', (name) => {
    authorizeProduction({ [name]: '' });
    expect(keystaticAuthoringState({ nodeEnv: 'production' })).toEqual({
      enabled: false,
      reason: 'missing-secrets',
    });
  });

  it('treats a present-but-blank value as missing, not as a value', () => {
    // The deploy env ships bare `KEY=` lines (ADR-0012). `??` would forward `''`;
    // `?.trim() || ''` must not. Whitespace-only is the same hazard wearing a hat.
    authorizeProduction({ KEYSTATIC_SECRET: '   ' });
    expect(keystaticAuthoringState({ nodeEnv: 'production' }).enabled).toBe(false);
  });

  it('rejects a truthy-but-wrong opt-in value', () => {
    // `'1'`, `'yes'`, `'TRUE'` are all things an operator types. Only the exact
    // string opens the gate, matching how keystatic.config.ts reads its own flag.
    for (const value of ['1', 'yes', 'TRUE', 'True', 'on']) {
      authorizeProduction({ KEYSTATIC_AUTHORING: value });
      expect(keystaticAuthoringState({ nodeEnv: 'production' }).enabled).toBe(false);
      vi.unstubAllEnvs();
    }
  });

  it('opens only when the opt-in, the public flag and every secret agree', () => {
    authorizeProduction();
    expect(keystaticAuthoringState({ nodeEnv: 'production' })).toEqual({
      enabled: true,
      reason: 'authorized',
    });
  });
});

describe('keystaticDisabledResponse', () => {
  it('is a contentless 404 that leaks no reason and is never cached', async () => {
    const res = keystaticDisabledResponse();
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');

    // A disabled CMS must be indistinguishable from one that was never deployed:
    // no env name, no reason code, nothing that tells a prober what to set.
    const body = await res.text();
    for (const leak of ['KEYSTATIC', 'AUTHORING', 'secret', 'opted', 'disagree']) {
      expect(body).not.toContain(leak);
    }
  });
});
