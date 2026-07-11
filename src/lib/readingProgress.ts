/**
 * Reader persistence for the reading sample — where the reader last was, and how
 * they like the prose set. Kept pure and dependency-free (like `reveal.ts`): the
 * clamp/parse/serialize logic is unit-tested, and the thin localStorage wrappers
 * swallow storage errors so a blocked/again-private store never throws.
 *
 * Two keys so the concerns stay independent: progress is per-return-visit and
 * churns on every scroll; prefs are sticky and change rarely.
 */

/** Last-read position — which chapter, and how far through it (0–1). */
export const READING_PROGRESS_KEY = 'dr-reading-progress';
/** Prose display preferences — font scale + line height. */
export const READING_PREFS_KEY = 'dr-reading-prefs';

export interface ReadingProgress {
  chapterId: string;
  /** Fraction scrolled through the current scene-page body, 0–1. */
  scrollPct: number;
  /** 1-based scene-page within the chapter; omitted (treated as 1) for part 1. */
  part?: number;
}

export interface ReadingPrefs {
  /** Multiplier on the base prose font size. */
  fontScale: number;
  /** Prose line-height (unitless). */
  lineHeight: number;
}

/** Bounds + step for the font-scale control. */
export const FONT_SCALE = { min: 0.85, max: 1.4, step: 0.05, default: 1 } as const;
/** Bounds + step for the line-height control. */
export const LINE_HEIGHT = { min: 1.5, max: 2.1, step: 0.1, default: 1.8 } as const;

export const DEFAULT_PREFS: ReadingPrefs = {
  fontScale: FONT_SCALE.default,
  lineHeight: LINE_HEIGHT.default,
};

/** Clamp a number into [min, max]; non-finite input falls back to `fallback`. */
export function clampTo(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Clamp a raw scroll fraction into [0, 1] (bad input → 0). */
export function clampScroll(pct: number): number {
  return clampTo(pct, 0, 1, 0);
}

/** Snap a preference value to its control's bounds, defaulting bad input. */
export function clampPrefs(prefs: Partial<ReadingPrefs> | null | undefined): ReadingPrefs {
  return {
    fontScale: clampTo(prefs?.fontScale ?? NaN, FONT_SCALE.min, FONT_SCALE.max, FONT_SCALE.default),
    lineHeight: clampTo(
      prefs?.lineHeight ?? NaN,
      LINE_HEIGHT.min,
      LINE_HEIGHT.max,
      LINE_HEIGHT.default,
    ),
  };
}

/** Parse persisted progress, returning null for anything malformed. Never throws. */
export function parseProgress(raw: string | null): ReadingProgress | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null) return null;
    const { chapterId, scrollPct, part } = obj as Record<string, unknown>;
    if (typeof chapterId !== 'string' || !chapterId) return null;
    const p =
      typeof part === 'number' && Number.isFinite(part) && part >= 2 ? Math.floor(part) : undefined;
    return {
      chapterId,
      scrollPct: clampScroll(typeof scrollPct === 'number' ? scrollPct : 0),
      ...(p ? { part: p } : {}),
    };
  } catch {
    return null;
  }
}

/** Parse persisted prefs, falling back to defaults for anything malformed. */
export function parsePrefs(raw: string | null): ReadingPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const obj = JSON.parse(raw) as Partial<ReadingPrefs>;
    return clampPrefs(obj);
  } catch {
    return DEFAULT_PREFS;
  }
}

/* ---- Thin, guarded localStorage wrappers (client only) ---- */

export function readProgress(): ReadingProgress | null {
  try {
    return parseProgress(localStorage.getItem(READING_PROGRESS_KEY));
  } catch {
    return null;
  }
}

export function writeProgress(progress: ReadingProgress): void {
  try {
    localStorage.setItem(
      READING_PROGRESS_KEY,
      JSON.stringify({
        chapterId: progress.chapterId,
        scrollPct: clampScroll(progress.scrollPct),
        // Part 1 is the canonical base URL, so only persist a later scene.
        ...(progress.part && progress.part >= 2 ? { part: Math.floor(progress.part) } : {}),
      }),
    );
  } catch {
    /* storage blocked — progress just won't persist this session */
  }
}

export function readPrefs(): ReadingPrefs {
  try {
    return parsePrefs(localStorage.getItem(READING_PREFS_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: ReadingPrefs): void {
  try {
    localStorage.setItem(READING_PREFS_KEY, JSON.stringify(clampPrefs(prefs)));
  } catch {
    /* storage blocked — prefs apply for this session only */
  }
}
