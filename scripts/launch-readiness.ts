/**
 * `pnpm run launch:check` — report the pre-launch funnel's state.
 *
 * Reads the facts (build env, byline, sample flag, optionally the live site) and
 * prints one line per precondition with its owner, so "is the funnel closed?"
 * has a command behind it instead of a claim. Exits 0 by default; `--strict`
 * exits 1 when anything is failing or unverified, for use as a release gate.
 *
 *   pnpm run launch:check            # local facts only
 *   pnpm run launch:check -- --net   # also probe the public site
 *   pnpm run launch:check -- --strict
 */
import { SITE_URL, authorIsNamed } from '../src/lib/site';
import { evaluateLaunchReadiness, type CheckOutcome } from '../src/lib/launchReadiness';
import { placeholderProseIds } from './lib/sample-doc.mjs';
import { resolvePublicEnv } from './lib/public-env.mjs';

const args = new Set(process.argv.slice(2));
const withNet = args.has('--net');
const strict = args.has('--strict');

const MARK: Record<CheckOutcome, string> = { pass: '  ok  ', fail: ' FAIL ', unknown: '  ??  ' };

/** Probe the public site. Returns the status, or null when unreachable. */
async function probe(url: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const siteHttpStatus = withNet ? await probe(SITE_URL) : undefined;

  // Through the same alias rule the build uses, so the board and the bundle can
  // never disagree about which ids resolved.
  const publicEnv = resolvePublicEnv();

  const report = evaluateLaunchReadiness({
    ga4Id: publicEnv.NEXT_PUBLIC_GA4_ID,
    kitFormId: publicEnv.NEXT_PUBLIC_KIT_FORM_ID,
    authorNamed: authorIsNamed(),
    placeholderProseIds: placeholderProseIds(),
    siteHttpStatus,
  });

  const width = Math.max(...report.checks.map((c) => c.label.length));
  console.log(`\nPre-launch funnel — ${SITE_URL}\n`);
  for (const check of report.checks) {
    const mark = MARK[check.outcome];
    console.log(
      `[${mark}] ${check.label.padEnd(width)}  ${check.owner.padEnd(11)} ${check.detail}`,
    );
  }

  const { pass, fail, unknown } = report.counts;
  console.log(`\n${pass} passing · ${fail} failing · ${unknown} unverified`);
  if (!withNet) console.log('Reachability not probed — re-run with `--net` to include it.');
  console.log(
    report.ready ? '\nThe funnel is closed and observable.\n' : '\nThe funnel is not closed.\n',
  );

  if (strict && !report.ready) process.exitCode = 1;
}

await main();
