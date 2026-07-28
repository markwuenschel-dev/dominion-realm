import { describe, it, expect } from 'vitest';
import { evaluateLaunchReadiness, type ReadinessInput } from './launchReadiness';

/**
 * Funnel readiness. The point of this module is that the end-to-end claim can
 * never be more optimistic than its weakest link, so most of these cases are
 * about `conversion` refusing to say 'pass'.
 */

const CLOSED: ReadinessInput = {
  ga4Id: 'G-TEST',
  kitFormId: '9590915',
  authorNamed: true,
  sampleProseIsPlaceholder: false,
  siteHttpStatus: 200,
};

const byId = (input: ReadinessInput, id: string) => {
  const found = evaluateLaunchReadiness(input).checks.find((c) => c.id === id);
  if (!found) throw new Error(`no check: ${id}`);
  return found;
};

describe('evaluateLaunchReadiness', () => {
  it('reports ready only when every precondition passes', () => {
    const report = evaluateLaunchReadiness(CLOSED);
    expect(report.ready).toBe(true);
    expect(report.counts.fail).toBe(0);
    expect(report.counts.unknown).toBe(0);
    expect(byId(CLOSED, 'conversion').outcome).toBe('pass');
  });

  it('never claims conversion passes while the sample is a placeholder', () => {
    const input = { ...CLOSED, sampleProseIsPlaceholder: true };
    expect(byId(input, 'sample-prose').outcome).toBe('fail');
    expect(byId(input, 'conversion').outcome).toBe('fail');
    expect(evaluateLaunchReadiness(input).ready).toBe(false);
  });

  it('never claims conversion passes while the site is unreachable', () => {
    const input = { ...CLOSED, siteHttpStatus: null };
    expect(byId(input, 'reachable').outcome).toBe('fail');
    expect(byId(input, 'conversion').outcome).toBe('fail');
  });

  it('treats an un-probed site as unverified, not as passing', () => {
    const input = { ...CLOSED, siteHttpStatus: undefined };
    expect(byId(input, 'reachable').outcome).toBe('unknown');
    expect(byId(input, 'conversion').outcome).toBe('unknown');
    expect(evaluateLaunchReadiness(input).ready).toBe(false);
  });

  it('treats a 5xx as unreachable-for-our-purposes', () => {
    expect(byId({ ...CLOSED, siteHttpStatus: 502 }, 'reachable').outcome).toBe('fail');
    expect(byId({ ...CLOSED, siteHttpStatus: 404 }, 'reachable').outcome).toBe('fail');
    expect(byId({ ...CLOSED, siteHttpStatus: 301 }, 'reachable').outcome).toBe('pass');
  });

  it('fails the public-ids check and names which id is empty', () => {
    const input = { ...CLOSED, ga4Id: '   ' };
    const check = byId(input, 'public-ids');
    expect(check.outcome).toBe('fail');
    expect(check.detail).toContain('NEXT_PUBLIC_GA4_ID');
    expect(check.detail).not.toContain('NEXT_PUBLIC_KIT_FORM_ID');
  });

  it('ties the signup check to the Kit id', () => {
    expect(byId({ ...CLOSED, kitFormId: '' }, 'signup').outcome).toBe('fail');
    expect(byId(CLOSED, 'signup').outcome).toBe('pass');
  });

  it('does not let the byline block conversion — it is not on the stranger path', () => {
    const input = { ...CLOSED, authorNamed: false };
    expect(byId(input, 'byline').outcome).toBe('fail');
    expect(byId(input, 'conversion').outcome).toBe('pass');
    expect(evaluateLaunchReadiness(input).ready).toBe(false);
  });

  it('attributes each check to the person who can clear it', () => {
    const owners = Object.fromEntries(
      evaluateLaunchReadiness(CLOSED).checks.map((c) => [c.id, c.owner]),
    );
    expect(owners['sample-prose']).toBe('author');
    expect(owners['byline']).toBe('author');
    expect(owners['reachable']).toBe('operator');
    expect(owners['public-ids']).toBe('engineering');
  });

  it('reports the current repository state as not ready', () => {
    // The honest baseline: nothing here should claim the funnel is closed today.
    const today = evaluateLaunchReadiness({
      ga4Id: '',
      kitFormId: '',
      authorNamed: true,
      sampleProseIsPlaceholder: true,
      siteHttpStatus: null,
    });
    expect(today.ready).toBe(false);
    expect(today.counts.fail).toBeGreaterThan(0);
  });
});
