import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCharacterSheetStore } from './characterSheetStore';
import { useSheetMigrationNoticeStore } from './sheetMigrationNoticeStore';
import { SHEET_QUARANTINE_KEY, SHEET_STORAGE_KEY } from '@/lib/sheetRecovery';
import { SHEET_ATTRIBUTE_KEYS } from '@/types/characterSheet';

/**
 * The rejected-sheet recovery transaction (campaign Q44–Q47).
 *
 * Each test here corresponds to a way the previous implementation lost the
 * reader's data or their explanation of what happened:
 *
 *  - `migrate` preserved the raw payload only until the next keystroke;
 *  - `merge` rejected a same-version blob in total silence and then let the very
 *    next write overwrite it;
 *  - a best-effort backup that failed still admitted a writable sheet;
 *  - and gating the UI on hydration completion strands the page forever on the
 *    rejection path, because zustand swallows `migrate`'s throw without ever
 *    firing its finish-hydration signals.
 */

const V2_UNMIGRATABLE = JSON.stringify({ state: { nope: true }, version: 2 });
const V3_INVALID = JSON.stringify({ state: { level: 'not-a-number' }, version: 3 });
// Derived from the canonical key list rather than hand-listed. A hand-written
// block silently omitted AGI on the first attempt, and because the schema
// deliberately rejects a PARTIAL attribute block as a wrong shape (not a
// clampable one), the fixture failed validation and looked like an
// implementation bug. Projecting it keeps the fixture correct by construction.
const V3_VALID = JSON.stringify({
  state: {
    name: 'Mara',
    level: 4,
    species: 'Human',
    className: 'None',
    soulLevel: 'Common',
    attributes: Object.fromEntries(SHEET_ATTRIBUTE_KEYS.map((k) => [k, 5])),
    conditionMods: { HP: 0, Mana: 0, Stamina: 0, Reserve: 0 },
    currentXP: 0,
  },
  version: 3,
});

beforeEach(() => {
  // The store is a module singleton, so in-memory state survives between cases.
  // Reset it BEFORE clearing storage: resetToDefaults() is a set(), which the
  // persist middleware writes straight back out.
  useCharacterSheetStore.getState().resetToDefaults();
  useSheetMigrationNoticeStore.getState().resetForTests();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const notice = () => useSheetMigrationNoticeStore.getState().notice;

describe('rejected-sheet recovery', () => {
  it('preserves the raw payload and notifies when a migration is rejected', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V2_UNMIGRATABLE);

    await useCharacterSheetStore.persist.rehydrate();

    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBe(V2_UNMIGRATABLE);
    expect(notice().status).toBe('rejected');
  });

  it('notifies on a rejected SAME-VERSION blob, which used to fail silently', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V3_INVALID);

    await useCharacterSheetStore.persist.rehydrate();

    // The regression: `merge` returned defaults with no notice and no copy.
    expect(notice().status).toBe('rejected');
    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBe(V3_INVALID);
  });

  it('survives the reader typing afterwards — an edit must not destroy the copy', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V2_UNMIGRATABLE);
    await useCharacterSheetStore.persist.rehydrate();

    // Exactly the interaction that used to overwrite the only surviving copy.
    useCharacterSheetStore.getState().setName('anything');

    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBe(V2_UNMIGRATABLE);
  });

  it('disables persistence rather than admitting a writable sheet when quarantine fails', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V2_UNMIGRATABLE);
    // Storage that reads but refuses to write: quota exhausted, or a browser
    // that allows reads and denies writes. The old code carried on regardless.
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    await useCharacterSheetStore.persist.rehydrate();

    expect(notice().status).toBe('persistence-unavailable');
    expect(useSheetMigrationNoticeStore.getState().persistenceDisabled).toBe(true);

    setItem.mockRestore();
    // And with writes possible again, the store still refuses: the session is
    // marked, so a later edit cannot quietly start overwriting the payload.
    useCharacterSheetStore.getState().setName('anything');
    expect(localStorage.getItem(SHEET_STORAGE_KEY)).toBe(V2_UNMIGRATABLE);
  });

  it('does not stack duplicate alerts when rehydration runs more than once', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V2_UNMIGRATABLE);

    await useCharacterSheetStore.persist.rehydrate();
    const first = notice();
    await useCharacterSheetStore.persist.rehydrate();

    expect(notice()).toEqual(first);
  });

  it('keeps the FIRST rejection, not the most recent one', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V2_UNMIGRATABLE);
    await useCharacterSheetStore.persist.rehydrate();

    localStorage.setItem(SHEET_STORAGE_KEY, V3_INVALID);
    await useCharacterSheetStore.persist.rehydrate();

    // The older sheet is the one the reader still cares about; the second was
    // never successfully loaded either.
    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBe(V2_UNMIGRATABLE);
  });

  it('loads a valid sheet without quarantining anything', async () => {
    localStorage.setItem(SHEET_STORAGE_KEY, V3_VALID);

    await useCharacterSheetStore.persist.rehydrate();

    expect(useCharacterSheetStore.getState().name).toBe('Mara');
    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBeNull();
    expect(notice().status).toBe('idle');
  });

  it('quarantines a MALFORMED envelope and survives the next edit', async () => {
    // Not `{state,version}` at all — a truncated write, or a damaged profile.
    // The adapter used to catch the parse failure and return null, which meant
    // neither rejection path ran: no copy, no notice, writes still enabled. The
    // reader's next keystroke then overwrote the only recoverable bytes.
    const MALFORMED = '{"state":{"name":"Mara"' as const;
    localStorage.setItem(SHEET_STORAGE_KEY, MALFORMED);

    await useCharacterSheetStore.persist.rehydrate();

    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBe(MALFORMED);
    expect(notice().status).toBe('rejected');

    // The interaction that used to destroy it.
    useCharacterSheetStore.getState().setName('anything');
    expect(localStorage.getItem(SHEET_QUARANTINE_KEY)).toBe(MALFORMED);
  });

  it('announces storage loss on a FIRST edit with no saved sheet, and stays disabled', async () => {
    // No prior sheet, nothing rejected: just a reader whose browser refuses to
    // store anything, or whose storage was revoked after hydration. Previously
    // silent — they could author a whole sheet and find it had never been kept.
    await useCharacterSheetStore.persist.rehydrate();
    expect(notice().status).toBe('idle');

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    useCharacterSheetStore.getState().setName('Mara');

    expect(notice().status).toBe('persistence-unavailable');
    expect(useSheetMigrationNoticeStore.getState().persistenceDisabled).toBe(true);

    // Storage comes back — the session stays disabled anyway. Re-enabling on a
    // later success would mean writes silently resume after the reader has been
    // told they will not, and half their edits would persist.
    setItem.mockRestore();
    useCharacterSheetStore.getState().setName('Mara II');
    expect(localStorage.getItem(SHEET_STORAGE_KEY)).toBeNull();
  });

  it('does not read storage at import time — hydration is the caller’s to trigger', async () => {
    // `skipHydration` is what makes the server render and the first client
    // render agree. If this regresses, /sheet mismatches on every return visit.
    //
    // Must be asserted against a FRESHLY imported module: by this point the
    // cases above have deliberately hydrated the shared singleton, so reading
    // its flag here would only prove that they ran.
    vi.resetModules();
    localStorage.setItem(SHEET_STORAGE_KEY, V3_VALID);
    const fresh = await import('./characterSheetStore');

    expect(fresh.useCharacterSheetStore.persist.hasHydrated()).toBe(false);
    expect(fresh.useCharacterSheetStore.getState().name).toBe('');
  });
});
