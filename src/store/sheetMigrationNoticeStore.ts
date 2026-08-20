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
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';

export type SheetMigrationNotice =
  | { status: 'idle' }
  | { status: 'migrated'; message: string }
  | { status: 'rejected'; message: string };

interface SheetMigrationNoticeState {
  notice: SheetMigrationNotice;
  setMigrated: (message: string) => void;
  setRejected: (message: string) => void;
  clear: () => void;
}

export const useSheetMigrationNoticeStore = create<SheetMigrationNoticeState>()((set) => ({
  notice: { status: 'idle' },
  setMigrated: (message) => set({ notice: { status: 'migrated', message } }),
  setRejected: (message) => set({ notice: { status: 'rejected', message } }),
  clear: () => set({ notice: { status: 'idle' } }),
}));
