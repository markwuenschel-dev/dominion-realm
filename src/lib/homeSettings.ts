import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { CoverArt } from './site';

/**
 * Homepage settings edited in the browser via Keystatic's `home` singleton
 * (`keystatic.config.ts`), stored as `src/content/settings/home.json`. Currently
 * just the hero book cover. Kept server-only (reads the file) so `site.ts` stays
 * client-safe and pure.
 */

// Keystatic's `home` singleton (format json). Depending on version it writes
// either `settings/home.json` or `settings/home/index.json` — read whichever
// exists so the CMS round-trip works without a config assumption.
const HOME_DIR = path.join(process.cwd(), 'src', 'content', 'settings');
const HOME_FILES = [path.join(HOME_DIR, 'home.json'), path.join(HOME_DIR, 'home', 'index.json')];

export interface HomeSettings {
  cover?: CoverArt;
}

/**
 * Read the homepage singleton. A missing file, unset cover, or an asset that
 * isn't on disk yields no cover — the hero renders without it rather than showing
 * a broken image (same spirit as the codex missing-image guard).
 */
export function getHomeSettings(): HomeSettings {
  const file = HOME_FILES.find((f) => fs.existsSync(f));
  if (!file) return {};
  let data: { coverImage?: string; coverAlt?: string };
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
  const src = data.coverImage;
  if (!src) return {};
  const asset = path.join(process.cwd(), 'public', src.replace(/^\//, ''));
  if (!fs.existsSync(asset)) return {};
  return { cover: { src, alt: data.coverAlt ?? 'The Dominion Realm' } };
}
