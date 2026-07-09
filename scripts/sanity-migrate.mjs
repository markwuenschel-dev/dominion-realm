/**
 * Phase-2 media migration / sync (ADR-0011, docs/prd/media-layer.md).
 *
 * One-way sync: prose (git) -> Sanity Subject, joined by slug. Reads each
 * character's frontmatter (name / image / imageAlt), uploads the portrait as a
 * Sanity asset, and creates-or-replaces a `subject` document keyed by a
 * deterministic id (`subject-<slug>`). The homepage cover (public/covers/cover.png)
 * becomes the `siteSettings` singleton's cover.
 *
 * Idempotent by design:
 *   - deterministic _ids + createOrReplace -> re-running updates in place,
 *     never duplicates documents;
 *   - Sanity dedupes identical asset uploads by content hash, so the same
 *     portrait is stored once no matter how often this runs.
 *
 * Orphan handling: any pre-existing character `subject` whose slug no longer has
 * a matching markdown entry is flagged `orphaned: true` (never auto-deleted) —
 * the art is kept for manual review, per the PRD.
 *
 * Usage (Node 22+, from the repo root):
 *   node --env-file=.env scripts/sanity-migrate.mjs            # apply
 *   node --env-file=.env scripts/sanity-migrate.mjs --dry-run  # preview only
 *
 * Requires SANITY_API_WRITE_TOKEN (Editor role) in the environment.
 */

import { createClient } from '@sanity/client';
import fg from 'fast-glob';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const COVER_PATH = path.join(ROOT, 'public', 'covers', 'cover.png');

/**
 * The codex collections synced into Sanity, each mapped to its Subject `kind`.
 * The join is by *collection*, not the git `kind:` taxonomy. Collections with no
 * git art (concepts/factions/places today) still get slug+title Subject shells so
 * the author can add Primary/Gallery/Map/Sigil art in Studio — the site keeps
 * falling back to git/placeholder until they do.
 */
const COLLECTIONS = [
  { dir: 'characters', kind: 'character' },
  { dir: 'concepts', kind: 'concept' },
  { dir: 'factions', kind: 'faction' },
  { dir: 'places', kind: 'place' },
];

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'zwq04v8v';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01';
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!token) {
  console.error(
    'ERROR: SANITY_API_WRITE_TOKEN is not set. Run with:\n' +
      '  node --env-file=.env scripts/sanity-migrate.mjs',
  );
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

/** Resolve a frontmatter image path to an absolute file on disk. */
function imageFileFor(imagePath) {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('/content-media/')) {
    // Served from public/ at runtime; the source lives under public/ too.
    return path.join(ROOT, 'public', imagePath.slice(1));
  }
  if (imagePath.startsWith('/')) return path.join(ROOT, 'public', imagePath.slice(1));
  return undefined;
}

/** Upload a local image file, returning its Sanity asset _id (or null in dry-run). */
async function uploadAsset(absPath) {
  const filename = path.basename(absPath);
  if (DRY_RUN) {
    console.log(`      [dry-run] would upload asset: ${filename}`);
    return null;
  }
  const asset = await client.assets.upload('image', fs.createReadStream(absPath), { filename });
  return asset._id;
}

/** Build an image field object referencing an uploaded asset. */
function imageField(assetId, alt) {
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: assetId },
    ...(alt ? { alt } : {}),
  };
}

async function migrateCollection({ dir, kind }) {
  const collectionDir = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(collectionDir)) {
    console.log(`\n${dir}: directory missing; skipping`);
    return new Set();
  }
  const files = fg.sync('**/*.{md,mdx}', { cwd: collectionDir });
  const seenSlugs = new Set();

  console.log(`\n${dir} → kind "${kind}" (${files.length} found)`);
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    seenSlugs.add(slug);
    const raw = fs.readFileSync(path.join(collectionDir, file), 'utf8');
    const { data } = matter(raw);
    const name = data.name ?? slug;
    const absPath = imageFileFor(data.image);

    if (!absPath || !fs.existsSync(absPath)) {
      console.log(`  · ${slug} — no art on disk; creating shell (primary stays empty)`);
    }

    console.log(`  → ${slug}  (${name})`);
    const assetId = absPath && fs.existsSync(absPath) ? await uploadAsset(absPath) : null;

    const doc = {
      _id: `subject-${slug}`,
      _type: 'subject',
      kind,
      title: name,
      slug: { _type: 'slug', current: slug },
      orphaned: false,
      ...(assetId ? { primary: imageField(assetId, data.imageAlt) } : {}),
    };

    if (DRY_RUN) {
      console.log(`      [dry-run] would createOrReplace subject-${slug}`);
    } else {
      await client.createOrReplace(doc);
      console.log(`      ✓ subject-${slug} ${assetId ? '(with primary)' : '(shell)'}`);
    }
  }
  return seenSlugs;
}

async function flagOrphans(kind, seenSlugs) {
  const existing = await client.fetch(
    `*[_type == "subject" && kind == $kind]{ _id, "slug": slug.current, orphaned }`,
    { kind },
  );
  const orphans = existing.filter((d) => d.slug && !seenSlugs.has(d.slug) && !d.orphaned);
  if (orphans.length === 0) return;
  console.log(`\nOrphans in "${kind}" (${orphans.length}) — prose gone, flagging (art kept)`);
  for (const o of orphans) {
    console.log(`  ⚠ ${o.slug}`);
    if (!DRY_RUN) await client.patch(o._id).set({ orphaned: true }).commit();
  }
}

async function migrateCover() {
  console.log(`\nSite cover`);
  if (!fs.existsSync(COVER_PATH)) {
    console.log(`  · no cover at ${path.relative(ROOT, COVER_PATH)}; skipping`);
    return;
  }
  console.log(`  → public/covers/cover.png`);
  const assetId = await uploadAsset(COVER_PATH);
  const doc = {
    _id: 'siteSettings',
    _type: 'siteSettings',
    ...(assetId ? { cover: imageField(assetId, 'The Dominion Realm — book cover') } : {}),
  };
  if (DRY_RUN) {
    console.log(`      [dry-run] would createOrReplace siteSettings`);
  } else {
    await client.createOrReplace(doc);
    console.log(`      ✓ siteSettings (cover set)`);
  }
}

async function main() {
  console.log(
    `Sanity media migration → project ${projectId}/${dataset}` +
      (DRY_RUN ? '  [DRY RUN — no writes]' : ''),
  );
  for (const collection of COLLECTIONS) {
    const seenSlugs = await migrateCollection(collection);
    await flagOrphans(collection.kind, seenSlugs);
  }
  await migrateCover();
  console.log(`\nDone.${DRY_RUN ? ' (dry run — nothing written)' : ''}`);
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message ?? err);
  process.exit(1);
});
