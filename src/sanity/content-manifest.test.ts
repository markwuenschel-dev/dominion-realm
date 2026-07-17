import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { READING_BEATS } from './content-manifest';

/**
 * Staleness gate for the committed manifest (audit CAND-04). The manifest is
 * generated at predev/prebuild but committed so tsc/CI work without a generator
 * run — which means nothing else notices when a chapter is added without
 * regenerating: the Studio coverage panes silently miss the new beat while every
 * pre-build CI check validates the stale file. This test recomputes the beat
 * list straight from the content tree (same rule as the generator: reading
 * filenames minus extension, sorted) and fails when the committed copy drifts.
 *
 * If this goes red, run: node scripts/generate-content-manifest.mjs
 */
describe('content-manifest', () => {
  it('committed READING_BEATS matches the reading content tree', () => {
    const dir = path.join(process.cwd(), 'src', 'content', 'reading');
    const fresh = fs
      .readdirSync(dir)
      .filter((f) => /\.mdx?$/.test(f))
      .map((f) => f.replace(/\.mdx?$/, ''))
      .sort();
    expect([...READING_BEATS]).toEqual(fresh);
  });
});
