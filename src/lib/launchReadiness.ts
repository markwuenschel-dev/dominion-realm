/**
 * Pre-launch funnel readiness — the Arrive → Convert chain, as checks.
 *
 * The chain has five preconditions and they are owned by different people. Until
 * now their state lived in prose: a comment saying the sample is placeholder, a
 * docstring saying the byline is a stand-in (it was not), a handoff note saying
 * the box is stopped. Two planning passes drew wrong conclusions from those
 * comments. This module makes each precondition a value that can be checked.
 *
 * Deliberately pure: no `fs`, no network, no `process.env` reads. The caller
 * gathers the facts and passes them in, so every branch is unit-testable and the
 * same logic can back a CLI, a test, or a future status route.
 */

export type CheckId =
  | 'reachable'
  | 'sample-prose'
  | 'byline'
  | 'public-ids'
  | 'signup'
  | 'conversion';

/** Who can actually clear the check — the funnel is not all engineering's. */
export type CheckOwner = 'engineering' | 'author' | 'operator';

export type CheckOutcome = 'pass' | 'fail' | 'unknown';

export interface CheckResult {
  id: CheckId;
  label: string;
  outcome: CheckOutcome;
  owner: CheckOwner;
  /** One line of evidence — what was observed, not what is believed. */
  detail: string;
}

export interface ReadinessInput {
  /** `NEXT_PUBLIC_GA4_ID` as the build saw it. */
  ga4Id?: string | null;
  /** `NEXT_PUBLIC_KIT_FORM_ID` as the build saw it. */
  kitFormId?: string | null;
  /** Whether `SITE.author` is a real byline rather than a bracketed stand-in. */
  authorNamed: boolean;
  /**
   * Reading-sample entry ids still running on stand-in prose. Empty means every
   * entry is the real manuscript. A list rather than a boolean so the report can
   * name the offending entry instead of condemning the whole sample.
   */
  placeholderProseIds: string[];
  /**
   * HTTP status from probing the public site. `null` means the probe ran and
   * the connection failed; `undefined` means no probe was attempted.
   */
  siteHttpStatus?: number | null;
}

const nonEmpty = (value: string | null | undefined): boolean => Boolean(value?.trim());

function reachable(input: ReadinessInput): CheckResult {
  const base = {
    id: 'reachable' as const,
    label: 'Site answers on :443',
    owner: 'operator' as const,
  };
  if (input.siteHttpStatus === undefined) {
    return { ...base, outcome: 'unknown', detail: 'Not probed (pass --net to check).' };
  }
  if (input.siteHttpStatus === null) {
    return { ...base, outcome: 'fail', detail: 'Connection refused or unreachable.' };
  }
  if (input.siteHttpStatus >= 200 && input.siteHttpStatus < 400) {
    return { ...base, outcome: 'pass', detail: `HTTP ${input.siteHttpStatus}.` };
  }
  return { ...base, outcome: 'fail', detail: `HTTP ${input.siteHttpStatus}.` };
}

function sampleProse(input: ReadinessInput): CheckResult {
  const pending = input.placeholderProseIds;
  return {
    id: 'sample-prose',
    label: 'Sample is the real manuscript',
    owner: 'author',
    outcome: pending.length > 0 ? 'fail' : 'pass',
    detail:
      pending.length > 0
        ? `Stand-in prose in ${pending.join(', ')} — the sample and both downloads carry it.`
        : 'Every reading-sample entry is flagged as the real manuscript.',
  };
}

function byline(input: ReadinessInput): CheckResult {
  return {
    id: 'byline',
    label: 'Byline names a real author',
    owner: 'author',
    outcome: input.authorNamed ? 'pass' : 'fail',
    detail: input.authorNamed
      ? 'SITE.author is a real name; metadata emits authors/creator/publisher.'
      : 'SITE.author is a bracketed stand-in; metadata suppresses attribution.',
  };
}

function publicIds(input: ReadinessInput): CheckResult {
  const missing: string[] = [];
  if (!nonEmpty(input.ga4Id)) missing.push('NEXT_PUBLIC_GA4_ID');
  if (!nonEmpty(input.kitFormId)) missing.push('NEXT_PUBLIC_KIT_FORM_ID');
  return {
    id: 'public-ids',
    label: 'Analytics and Kit ids resolve',
    owner: 'engineering',
    outcome: missing.length === 0 ? 'pass' : 'fail',
    detail:
      missing.length === 0 ? 'Both ids present in the build env.' : `Empty: ${missing.join(', ')}.`,
  };
}

function signup(input: ReadinessInput): CheckResult {
  const live = nonEmpty(input.kitFormId);
  return {
    id: 'signup',
    label: 'Signup form is live',
    owner: 'engineering',
    outcome: live ? 'pass' : 'fail',
    detail: live
      ? 'Form renders with a Kit action.'
      : 'No Kit id — the page shows a notice instead of a form (it no longer fakes success).',
  };
}

/**
 * The end-to-end claim. It is only ever `pass` when every link in the chain a
 * stranger walks is itself passing — deliberately conservative, because this is
 * the check that would otherwise be asserted rather than observed.
 */
function conversion(parts: CheckResult[]): CheckResult {
  const required: CheckId[] = ['reachable', 'sample-prose', 'public-ids', 'signup'];
  const relevant = parts.filter((p) => required.includes(p.id));
  const failing = relevant.filter((p) => p.outcome === 'fail');
  const unknown = relevant.filter((p) => p.outcome === 'unknown');

  const base = {
    id: 'conversion' as const,
    label: 'Stranger → sample → email capture',
    owner: 'engineering' as const,
  };
  if (failing.length > 0) {
    return {
      ...base,
      outcome: 'fail',
      detail: `Blocked by: ${failing.map((f) => f.id).join(', ')}.`,
    };
  }
  if (unknown.length > 0) {
    return {
      ...base,
      outcome: 'unknown',
      detail: `Unverified: ${unknown.map((u) => u.id).join(', ')}.`,
    };
  }
  return { ...base, outcome: 'pass', detail: 'Every link in the chain is passing.' };
}

export interface ReadinessReport {
  checks: CheckResult[];
  /** True only when nothing is failing and nothing is unknown. */
  ready: boolean;
  counts: Record<CheckOutcome, number>;
}

/** Evaluate every precondition. Order is the order a stranger meets them. */
export function evaluateLaunchReadiness(input: ReadinessInput): ReadinessReport {
  const parts = [
    reachable(input),
    sampleProse(input),
    byline(input),
    publicIds(input),
    signup(input),
  ];
  const checks = [...parts, conversion(parts)];
  const counts: Record<CheckOutcome, number> = { pass: 0, fail: 0, unknown: 0 };
  for (const c of checks) counts[c.outcome] += 1;
  return { checks, ready: counts.fail === 0 && counts.unknown === 0, counts };
}
