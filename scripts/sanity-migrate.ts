/**
 * Phase-2 media migration / sync (ADR-0011, docs/prd/media-layer.md).
 *
 * One-way sync: prose (git) -> Sanity Subject, joined by slug. Reads each
 * codex entry via the shared content engine, uploads portrait art as a Sanity
 * asset, and creates-or-replaces a `subject` document keyed by a deterministic
 * id (`subject-<slug>`). The homepage cover (public/covers/cover.png) becomes
 * the `siteSettings` singleton's cover.
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
 *   pnpm exec tsx --env-file=.env scripts/sanity-migrate.ts            # apply
 *   pnpm exec tsx --env-file=.env scripts/sanity-migrate.ts --dry-run  # preview
 *
 * Requires SANITY_API_WRITE_TOKEN (Editor role) in the environment.
 */

import { createClient } from '@sanity/client';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  CODEX_COLLECTIONS,
  imageSourcePath,
  loadCollection,
  type CodexCollection,
} from '../src/lib/contentCore';
import { subjectKindFor } from '../src/sanity/collectionKind';
import type { SubjectKind } from '../src/sanity/slotMap';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.cwd();
const COVER_PATH = path.join(ROOT, 'public', 'covers', 'cover.png');

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'zwq04v8v';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01';
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!token) {
  console.error(
    'ERROR: SANITY_API_WRITE_TOKEN is not set. Run with:\n' +
      '  pnpm exec tsx --env-file=.env scripts/sanity-migrate.ts',
  );
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

/** Upload a local image file, returning its Sanity asset _id (or null in dry-run). */
async function uploadAsset(absPath: string): Promise<string | null> {
  const filename = path.basename(absPath);
  if (DRY_RUN) {
    console.log(`      [dry-run] would upload asset: ${filename}`);
    return null;
  }
  const asset = await client.assets.upload('image', fs.createReadStream(absPath), { filename });
  return asset._id;
}

/** Build an image field object referencing an uploaded asset. */
function imageField(assetId: string, alt?: string) {
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: assetId },
    ...(alt ? { alt } : {}),
  };
}

async function migrateCollection(collection: CodexCollection): Promise<Set<string>> {
  const kind = subjectKindFor(collection);
  // Include drafts so Studio Subjects stay in sync with every prose file.
  const entries = loadCollection(collection, 'include');
  const seenSlugs = new Set<string>();

  console.log(`\n${collection} → kind "${kind}" (${entries.length} found)`);
  for (const entry of entries) {
    seenSlugs.add(entry.id);
    const name = entry.data.name;
    const absPath = imageSourcePath(entry.data.image);
    const alt = 'imageAlt' in entry.data ? entry.data.imageAlt : undefined;

    if (!absPath) {
      console.log(`  · ${entry.id} — no art on disk; creating shell (primary stays empty)`);
    }

    console.log(`  → ${entry.id}  (${name})`);
    const assetId = absPath ? await uploadAsset(absPath) : null;

    const doc = {
      _id: `subject-${entry.id}`,
      _type: 'subject',
      kind,
      title: name,
      slug: { _type: 'slug', current: entry.id },
      orphaned: false,
      ...(assetId ? { primary: imageField(assetId, alt) } : {}),
    };

    if (DRY_RUN) {
      console.log(`      [dry-run] would createOrReplace subject-${entry.id}`);
    } else {
      await client.createOrReplace(doc);
      console.log(`      ✓ subject-${entry.id} ${assetId ? '(with primary)' : '(shell)'}`);
    }
  }
  return seenSlugs;
}

async function flagOrphans(kind: SubjectKind, seenSlugs: Set<string>) {
  const existing = await client.fetch<{ _id: string; slug: string | null; orphaned?: boolean }[]>(
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
  for (const collection of CODEX_COLLECTIONS) {
    const seenSlugs = await migrateCollection(collection);
    await flagOrphans(subjectKindFor(collection), seenSlugs);
  }
  await migrateCover();
  console.log(`\nDone.${DRY_RUN ? ' (dry run — nothing written)' : ''}`);
}

main().catch((err: unknown) => {
  console.error('\nMigration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
