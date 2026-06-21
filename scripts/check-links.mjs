#!/usr/bin/env node
/**
 * Internal link + base-path guard for the built site.
 *
 * Scans every HTML file in the build output and checks each root-relative
 * href/src. A link must (a) start with the configured base path and (b) resolve
 * to a file that actually exists in the build. This catches dead internal links
 * and asset references, and specifically the base-path concatenation bug that
 * once shipped `/dominion-realmcodex` to production (a link that doesn't start
 * with `/dominion-realm/` fails the first check).
 *
 * Usage: node scripts/check-links.mjs [distDir] [base]
 *   distDir  build output directory (default "dist")
 *   base     site base path, must start and end with "/" (default "/")
 *
 * Zero dependencies. Exits non-zero with a report if any link is broken.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';

const distDir = process.argv[2] ?? 'dist';
let base = process.argv[3] ?? '/';
if (!base.startsWith('/')) base = '/' + base;
if (!base.endsWith('/')) base += '/';

const SKIP_SCHEME = /^(?:https?:|\/\/|mailto:|tel:|data:|javascript:|blob:)/i;

/** Recursively collect *.html files under a directory. */
function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
}

/** Does a root-relative path (relative to dist root) resolve to a real file? */
function resolves(relFromRoot) {
  let p = relFromRoot.replace(/[?#].*$/, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const direct = join(distDir, p);
  if (existsSync(direct) && statSync(direct).isFile()) return true;
  // bare path that is really a directory route, or an extensionless page
  if (existsSync(join(distDir, p, 'index.html'))) return true;
  if (existsSync(direct + '.html')) return true;
  return false;
}

if (!existsSync(distDir)) {
  console.error(`check-links: build directory "${distDir}" not found — run the build first.`);
  process.exit(2);
}

const files = htmlFiles(distDir);
const errors = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const attrRe = /(?:href|src)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    let url = decodeEntities(m[1]).trim();
    if (!url || url.startsWith('#') || SKIP_SCHEME.test(url)) continue;
    checked++;

    if (url.startsWith('/')) {
      if (!url.startsWith(base)) {
        errors.push({ file, url, why: `does not start with base "${base}" (base-path bug?)` });
        continue;
      }
      const rel = url.slice(base.length);
      if (!resolves(rel)) errors.push({ file, url, why: 'no matching file in build' });
    } else {
      // relative to this file's directory
      const relDir = dirname(file)
        .slice(distDir.length)
        .replace(/^[/\\]/, '');
      const rel = posix.normalize(posix.join(relDir.split(/[/\\]/).join('/'), url));
      if (!resolves(rel)) errors.push({ file, url, why: 'relative link has no matching file' });
    }
  }
}

if (errors.length) {
  console.error(`\ncheck-links: ${errors.length} broken link(s) found:\n`);
  for (const e of errors) {
    console.error(`  ✗ ${e.url}\n      in ${e.file}\n      ${e.why}`);
  }
  console.error(`\nChecked ${checked} link(s) across ${files.length} page(s).`);
  process.exit(1);
}

console.log(`check-links: OK — ${checked} link(s) across ${files.length} page(s), base "${base}".`);
