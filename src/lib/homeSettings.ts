import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
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

// Schema for the singleton's JSON, mirroring the Markdown collections' Zod gate
// in content.ts: Keystatic-produced files crossing into the app must parse, and
// a bad document fails the build loudly instead of silently dropping the cover.
const homeSettingsSchema = z.object({
  coverImage: z.string().optional(),
  coverAlt: z.string().optional(),
});

/**
 * Parse the raw singleton JSON. Malformed JSON or a wrong-shaped document throws
 * (naming the source file); an empty or cover-less document is a legitimate
 * state and parses to `{}`. Exported for tests — file access stays in
 * `getHomeSettings`.
 */
export function parseHomeSettings(raw: string, file: string): z.infer<typeof homeSettingsSchema> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${file}: ${(err as Error).message}`, { cause: err });
  }
  try {
    return homeSettingsSchema.parse(data);
  } catch (err) {
    throw new Error(`Invalid home settings in ${file}: ${(err as Error).message}`, { cause: err });
  }
}

/**
 * Read the homepage singleton. A missing file, unset cover, or an asset that
 * isn't on disk yields no cover — the hero renders without it rather than showing
 * a broken image (same spirit as the codex missing-image guard). A *corrupt*
 * file, by contrast, throws via `parseHomeSettings` — that's an authoring error
 * the build must surface, not a state to render around.
 */
export function getHomeSettings(): HomeSettings {
  const file = HOME_FILES.find((f) => fs.existsSync(f));
  if (!file) return {};
  const data = parseHomeSettings(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file));
  const src = data.coverImage;
  if (!src) return {};
  const asset = path.join(process.cwd(), 'public', src.replace(/^\//, ''));
  if (!fs.existsSync(asset)) return {};
  return { cover: { src, alt: data.coverAlt ?? 'The Dominion Realm' } };
}
