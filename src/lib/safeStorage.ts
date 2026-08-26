/**
 * One guarded seam for every browser-storage access.
 *
 * `localStorage` is not merely absent in some environments — it *throws* on
 * access in others (Safari private mode, storage-blocked embeds, a browser
 * configured to deny site data). Before this module each caller invented its own
 * guard, and one forgot: `ThemeSwitcher` read storage unguarded before setting
 * its mounted flag, so a throwing store made the theme control disappear from
 * the page permanently rather than merely failing to remember a preference.
 *
 * The important design point is that these helpers **report failure instead of
 * hiding it**. A silent `try/catch` is right for a reading position and wrong
 * for a character sheet the reader typed by hand: under the campaign's recovery
 * policy, machine-derived state degrades silently while reader-authored state
 * must say so. A helper that swallowed both could not tell those cases apart, so
 * every write returns whether it actually persisted and the caller decides what
 * that means.
 *
 * Nothing here throws. Availability is probed per call rather than cached: a
 * browser can revoke storage mid-session, and a cached "available" would then be
 * a lie for the rest of the page's life.
 */

/** A read that distinguishes "no value" from "storage unreachable". */
export type StorageRead =
  | { ok: true; value: string | null }
  | { ok: false; value: null; reason: 'unavailable' };

/** Whether a write actually reached storage. */
export type StorageWrite = { ok: true } | { ok: false; reason: 'unavailable' };

const UNAVAILABLE_READ: StorageRead = { ok: false, value: null, reason: 'unavailable' };
const UNAVAILABLE_WRITE: StorageWrite = { ok: false, reason: 'unavailable' };

/**
 * Resolve `localStorage` without throwing.
 *
 * Reading the property itself can throw, which is why this is not a simple
 * `typeof window === 'undefined'` check — that guards server rendering, not a
 * browser that denies site data.
 */
function store(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

/** Read a key. `ok: false` means storage is unreachable, not that the key is unset. */
export function safeGet(key: string): StorageRead {
  const s = store();
  if (s === null) return UNAVAILABLE_READ;
  try {
    return { ok: true, value: s.getItem(key) };
  } catch {
    return UNAVAILABLE_READ;
  }
}

/** Write a key. Returns whether the value actually persisted. */
export function safeSet(key: string, value: string): StorageWrite {
  const s = store();
  if (s === null) return UNAVAILABLE_WRITE;
  try {
    s.setItem(key, value);
    return { ok: true };
  } catch {
    // Quota exceeded and permission denied are indistinguishable here and want
    // the same handling: the value did not persist.
    return UNAVAILABLE_WRITE;
  }
}

/** Remove a key. Returns whether the removal actually happened. */
export function safeRemove(key: string): StorageWrite {
  const s = store();
  if (s === null) return UNAVAILABLE_WRITE;
  try {
    s.removeItem(key);
    return { ok: true };
  } catch {
    return UNAVAILABLE_WRITE;
  }
}

/**
 * Convenience for callers that genuinely do not care why a read failed —
 * preferences, theme, reveal tier, reading position. Reader-authored state must
 * NOT use this: it needs to tell "unset" from "unreachable".
 */
export function safeGetValue(key: string): string | null {
  return safeGet(key).value;
}
