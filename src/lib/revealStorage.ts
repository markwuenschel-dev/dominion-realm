import { REVEAL_STORAGE_KEY, parseTier, type RevealTier } from './reveal';

/**
 * Thin, guarded localStorage wrappers for the reader's chosen reveal level
 * (client only). Mirrors the reading-progress persistence seam
 * (`readProgress`/`writeProgress`) so the parse/guard logic is pure and
 * unit-testable, rather than inlined in the `RevealProvider` where it was only
 * reachable through React. `reveal.ts` stays pure/SSR-safe; the browser-storage
 * access lives here.
 */

/**
 * The persisted reveal level, or `null` when nothing valid is stored or storage
 * is unavailable (private mode, blocked). An invalid stored value coerces to the
 * safe default via `parseTier` rather than returning null.
 */
export function readReveal(): RevealTier | null {
  try {
    const raw = localStorage.getItem(REVEAL_STORAGE_KEY);
    return raw === null ? null : parseTier(raw);
  } catch {
    return null;
  }
}

/** Persist the reader's chosen level. A blocked store fails silently — the level
 *  still applies for the current session. */
export function writeReveal(tier: RevealTier): void {
  try {
    localStorage.setItem(REVEAL_STORAGE_KEY, tier);
  } catch {
    /* storage blocked — still applies for this session */
  }
}
