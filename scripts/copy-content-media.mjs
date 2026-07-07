// Copies non-Markdown assets that live beside content files (portraits, key art)
// into `public/content-media/<collection>/<file>` so Next can serve them. The
// content loader rewrites frontmatter `image:` paths to these URLs. Runs at
// prebuild/predev. Generated output is gitignored. (ADR-0010 — replaces Astro's
// `image()` pipeline.)
import fs from 'node:fs';
import path from 'node:path';

const CONTENT = path.join(process.cwd(), 'src', 'content');
const OUT = path.join(process.cwd(), 'public', 'content-media');
const MEDIA = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

fs.rmSync(OUT, { recursive: true, force: true });

let copied = 0;
for (const collection of fs.readdirSync(CONTENT, { withFileTypes: true })) {
  if (!collection.isDirectory()) continue;
  const srcDir = path.join(CONTENT, collection.name);
  const destDir = path.join(OUT, collection.name);
  // Preserve the sub-path within the collection so per-entry asset folders (which
  // Keystatic writes as `<collection>/<slug>/<file>`) survive the copy and match
  // the URL stored in frontmatter. Legacy images at the collection root (rel = '')
  // are unaffected.
  const walk = (dir, rel = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const relPath = path.join(rel, e.name);
      if (e.isDirectory()) walk(full, relPath);
      else if (MEDIA.test(e.name)) {
        const dest = path.join(destDir, relPath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(full, dest);
        copied++;
      }
    }
  };
  walk(srcDir);
}

console.log(`[content-media] copied ${copied} asset(s) → public/content-media/`);
