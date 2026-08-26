/**
 * The rejected-sheet recovery transaction.
 *
 * A rejected saved sheet is the one piece of state on this site the reader typed
 * themselves, so losing it silently is data loss rather than a lost preference.
 * The store already understood half of that: `migrate` throws instead of
 * returning, specifically so zustand's persist middleware skips `merge`/`setItem`
 * and leaves the raw payload in storage. But "left in storage" is only durable
 * until the reader's next keystroke — any `set()` on a persisted store rewrites
 * the key, so the original survived exactly one interaction.
 *
 * This module makes the durability claim true independently of what the reader
 * does next: the exact raw envelope is copied to a separate quarantine record
 * *before* a writable default sheet is admitted, and persistence is refused
 * outright when that copy cannot be made. Recovery is offered, never automatic —
 * the reader decides whether to download the old sheet or discard it.
 *
 * Two rules the earlier code got wrong, both now enforced here rather than at
 * each call site:
 *
 * - **Preserve before admitting a writable sheet.** A best-effort backup that
 *   fails leaves the reader with a live sheet writing over their only copy. When
 *   quarantine fails, persistence is disabled for the session instead.
 * - **One contract for both rejection paths.** A version-migration rejection and
 *   a same-version parse rejection are the same fact to a reader — "your saved
 *   sheet did not load" — and previously produced opposite amounts of
 *   explanation, one alerting and one silent.
 */

import { safeGet, safeRemove, safeSet } from '@/lib/safeStorage';

/** The live persisted sheet. Must match the `name` given to zustand's persist. */
export const SHEET_STORAGE_KEY = 'dominion-realm-character-sheet';

/**
 * The quarantined raw envelope. A separate key so the live store can never
 * rewrite it, and namespaced under the sheet key so its origin is obvious to
 * anyone reading storage in devtools.
 */
export const SHEET_QUARANTINE_KEY = 'dominion-realm-character-sheet.rejected';

export type QuarantineOutcome =
  /** The raw envelope is preserved; a writable sheet may be admitted. */
  | { status: 'quarantined' }
  /** A previous rejection is already preserved; the older copy is kept. */
  | { status: 'already-held' }
  /** Nothing could be preserved. The caller MUST NOT admit a writable sheet. */
  | { status: 'failed'; reason: 'unavailable' };

/**
 * Copy the raw persisted envelope into quarantine.
 *
 * Never overwrites an existing quarantine record. If a reader hits two
 * rejections in a row, the *first* one is the one they still care about — the
 * second is already a copy of a sheet they never successfully loaded.
 */
export function quarantineRejectedSheet(raw: string | null): QuarantineOutcome {
  if (raw === null) {
    // Nothing to preserve. Not a failure: an absent key is how a first-time
    // reader arrives, and there is no data at risk.
    return { status: 'quarantined' };
  }

  const existing = safeGet(SHEET_QUARANTINE_KEY);
  if (!existing.ok) return { status: 'failed', reason: 'unavailable' };
  if (existing.value !== null) return { status: 'already-held' };

  const written = safeSet(SHEET_QUARANTINE_KEY, raw);
  if (!written.ok) return { status: 'failed', reason: 'unavailable' };
  return { status: 'quarantined' };
}

/** The preserved raw envelope, if one is held. */
export function readQuarantinedSheet(): string | null {
  return safeGet(SHEET_QUARANTINE_KEY).value;
}

/** Whether a recovery copy is currently held, for rendering the recovery controls. */
export function hasQuarantinedSheet(): boolean {
  return readQuarantinedSheet() !== null;
}

/**
 * Drop the recovery copy. Only ever called from an explicit reader action —
 * there is deliberately no expiry or garbage collection, because a copy that
 * disappears on a timer is not a recovery guarantee, and the reader is the only
 * one who can know they no longer need it.
 */
export function discardQuarantinedSheet(): boolean {
  return safeRemove(SHEET_QUARANTINE_KEY).ok;
}

/** The live raw envelope, read directly rather than through zustand. */
export function readRawPersistedSheet(): string | null {
  return safeGet(SHEET_STORAGE_KEY).value;
}
