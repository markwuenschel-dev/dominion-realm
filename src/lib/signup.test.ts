import { describe, it, expect } from 'vitest';
import { resolveSignup, signupFromEnv, KIT_FORMS_BASE, SIGNUP_UNAVAILABLE_NOTE } from './signup';

/**
 * Newsletter signup state selection. The homepage just renders these states, so
 * the branching (live Kit form vs. honest notice) is tested here.
 *
 * The regression this pins: an unset form id used to leave the `action`
 * attribute undefined, which makes an HTML form post to the current URL and
 * silently swallow the visitor's email. `mode` must never be 'live' without a
 * fully-formed absolute action.
 */
describe('resolveSignup', () => {
  it('reports unavailable when no form id is set', () => {
    const state = resolveSignup({});
    expect(state.mode).toBe('unavailable');
    expect(state).not.toHaveProperty('action');
  });

  it('treats blank / whitespace-only form ids as unset', () => {
    expect(resolveSignup({ formId: '' }).mode).toBe('unavailable');
    expect(resolveSignup({ formId: '   ' }).mode).toBe('unavailable');
    expect(resolveSignup({ formId: null }).mode).toBe('unavailable');
  });

  it('carries a reader-facing note in the unavailable state', () => {
    const state = resolveSignup({});
    expect(state.mode).toBe('unavailable');
    if (state.mode !== 'unavailable') throw new Error('expected unavailable');
    expect(state.note).toBe(SIGNUP_UNAVAILABLE_NOTE);
    expect(state.note.trim().length).toBeGreaterThan(0);
  });

  it('builds the Kit endpoint when a form id is set', () => {
    const state = resolveSignup({ formId: '9590915' });
    expect(state.mode).toBe('live');
    if (state.mode !== 'live') throw new Error('expected live');
    expect(state.action).toBe(`${KIT_FORMS_BASE}/9590915/subscriptions`);
  });

  it('trims surrounding whitespace on the form id', () => {
    const state = resolveSignup({ formId: '  9590915  ' });
    expect(state.mode).toBe('live');
    if (state.mode !== 'live') throw new Error('expected live');
    expect(state.action).toBe(`${KIT_FORMS_BASE}/9590915/subscriptions`);
  });

  it('never yields a live state with a relative or empty action', () => {
    for (const formId of ['', '   ', null, undefined]) {
      const state = resolveSignup({ formId });
      expect(state.mode).toBe('unavailable');
    }
    const live = resolveSignup({ formId: '123' });
    if (live.mode !== 'live') throw new Error('expected live');
    expect(live.action.startsWith('https://')).toBe(true);
  });
});

describe('signupFromEnv', () => {
  it('reads NEXT_PUBLIC_KIT_FORM_ID from the environment', () => {
    const prev = process.env.NEXT_PUBLIC_KIT_FORM_ID;
    try {
      process.env.NEXT_PUBLIC_KIT_FORM_ID = '4242';
      const state = signupFromEnv();
      expect(state.mode).toBe('live');
      if (state.mode !== 'live') throw new Error('expected live');
      expect(state.action).toBe(`${KIT_FORMS_BASE}/4242/subscriptions`);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_KIT_FORM_ID;
      else process.env.NEXT_PUBLIC_KIT_FORM_ID = prev;
    }
  });

  it('reports unavailable when the environment variable is empty', () => {
    const prev = process.env.NEXT_PUBLIC_KIT_FORM_ID;
    try {
      process.env.NEXT_PUBLIC_KIT_FORM_ID = '';
      expect(signupFromEnv().mode).toBe('unavailable');
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_KIT_FORM_ID;
      else process.env.NEXT_PUBLIC_KIT_FORM_ID = prev;
    }
  });
});
