// ─────────────────────────────────────────────────────────────────────────────
// store/sheetMigrationNoticeStore.ts — deliberately NOT persisted (audit RHA-01).
//
// characterSheetStore's persist `migrate` records its outcome here before it
// returns or throws. This store must stay separate from characterSheetStore:
// any set() on a persisted store re-runs `partialize` and writes the current
// state back to localStorage (zustand/esm/middleware.mjs's wrapped setState),
// even for fields excluded from partialize. If a rejected-migration notice
// lived on characterSheetStore itself, showing it would itself trigger the
// write that a rejected migration must avoid — the whole reason `migrate`
// throws instead of returning a value is so zustand's persist middleware
// skips `merge`/`setItem` and leaves the raw saved payload in localStorage
// untouched and recoverable. A plain, unpersisted store has no such write.
//
// It also owns `persistenceDisabled`, the session kill-switch for sheet writes.
// That lives here for the same reason: the flag exists to PREVENT a write, so
// setting it must not itself cause one. It is consulted by the sheet store's
// storage adapter on every setItem.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';

export type SheetMigrationNotice =
  | { status: 'idle' }
  | { status: 'migrated'; message: string }
  | { status: 'rejected'; message: string }
  /**
   * The reader's sheet cannot be saved at all this session — storage is
   * unreachable, or a rejected sheet could not be quarantined and admitting a
   * writable sheet would overwrite their only copy. Distinct from `rejected`:
   * that one says "the old sheet did not load", this one says "nothing you type
   * now will be kept", and a reader needs to know which they are looking at.
   */
  | { status: 'persistence-unavailable'; message: string };

interface SheetMigrationNoticeState {
  notice: SheetMigrationNotice;
  /** When true the sheet store's storage adapter refuses every write. */
  persistenceDisabled: boolean;
  setMigrated: (message: string) => void;
  setRejected: (message: string) => void;
  setPersistenceUnavailable: (message: string) => void;
  /** Dismiss the visible notice. Does NOT re-enable writes — see the impl. */
  clearNotice: () => void;
  /** Test-only. Resets the safety flag as well; never call from product code. */
  resetForTests: () => void;
}

export const useSheetMigrationNoticeStore = create<SheetMigrationNoticeState>()((set, get) => ({
  notice: { status: 'idle' },
  persistenceDisabled: false,

  setMigrated: (message) => set({ notice: { status: 'migrated', message } }),

  /**
   * Idempotent by status. Zustand can invoke a rehydration path more than once
   * (an explicit `rehydrate()` after `skipHydration`, a remount, a devtools
   * replay), and one damaged blob must not stack duplicate alerts on the reader.
   * A later, more severe `persistence-unavailable` still wins — see below.
   */
  setRejected: (message) => {
    if (get().notice.status === 'rejected') return;
    set({ notice: { status: 'rejected', message } });
  },

  /**
   * Outranks every other notice and is sticky. "Your old sheet failed to load"
   * is survivable; "nothing you type will be saved" is the fact that changes
   * what the reader should do next, so it must not be displaced by a later
   * rejection notice from a repeated hydration attempt.
   */
  setPersistenceUnavailable: (message) => {
    set({ notice: { status: 'persistence-unavailable', message }, persistenceDisabled: true });
  },

  /**
   * Dismisses the visible notice ONLY.
   *
   * Deliberately does not touch `persistenceDisabled`, and named for what it
   * actually does so nobody reaches for it expecting a full reset. The flag is a
   * safety state, not a piece of presentation: it is set when a rejected sheet
   * could not be preserved, or when storage refused an ordinary write. Clearing
   * it because a reader dismissed a message would silently re-enable the writes
   * that were stopped to protect their data.
   *
   * A genuine reset exists for tests only — see `resetForTests`.
   */
  clearNotice: () => set({ notice: { status: 'idle' } }),

  /**
   * Test-only full reset, including the safety flag.
   *
   * The store is a module singleton, so suites must be able to return it to a
   * known state — but no product code should ever clear a safety flag, which is
   * why this is separate from clearNotice rather than an option on it.
   */
  resetForTests: () => set({ notice: { status: 'idle' }, persistenceDisabled: false }),
}));
