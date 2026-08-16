import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCharacterSheetStore } from './characterSheetStore';
import { useSheetMigrationNoticeStore } from './sheetMigrationNoticeStore';

/**
 * RHA-01: the persist config carries version: 3 but previously had no
 * `migrate` function — a version mismatch on load was discarded entirely
 * (zustand's own no-migrate fallback), and two prior version bumps (v0→v2,
 * v2→v3) shipped as deliberate resets rather than migrations.
 *
 * v2→v3 is the one evidenced, reconstructable delta (commit 2fe196e):
 * attributes.Faith→CVN, attributes.Occult→MYS (pure rename), and the
 * top-level classAcquisitionLevel field dropped. Every other field is
 * unchanged. This is the ONLY version this migrate function reconstructs —
 * v0/v1 never existed, and no future version is guessed at.
 *
 * Critical correctness property (verified directly against
 * node_modules/zustand/esm/middleware.mjs this session, not assumed): a
 * `migrate` that RETURNS undefined for an unsupported/invalid input still
 * counts as `migrated: true` in zustand v5, which immediately persists
 * `merge(undefined, currentState)` (i.e. defaults) back over the raw saved
 * payload — permanently destroying it. `migrate` must THROW for any
 * unsupported/invalid input instead: a thrown migrate rejects zustand's
 * internal promise chain, which skips `merge`/`setItem` entirely and never
 * touches localStorage, leaving the raw payload recoverable.
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';

function seedPersistedSheet(state: Record<string, unknown>, version: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version }));
}

function rawStoredBlob(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

const V2_STATE = {
  name: 'Old Marcus',
  level: 8,
  species: 'Human',
  className: 'None',
  classAcquisitionLevel: 3, // dropped in v3
  soulLevel: 'Common',
  attributes: {
    CON: 12,
    END: 7,
    STR: 6,
    AGI: 5,
    DEX: 5,
    INT: 9,
    WIS: 8,
    CHA: 5,
    Faith: 11, // renamed -> CVN
    Occult: 14, // renamed -> MYS
    LUCK: 5,
  },
  conditionMods: { HP: 1.0, Mana: 1.0, Stamina: 1.0, Reserve: 1.0 },
  currentResources: { HP: 50, Mana: 50, Stamina: 50, Reserve: 40 },
  currentXP: 250,
};

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
  useSheetMigrationNoticeStore.getState().clear();
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
  useSheetMigrationNoticeStore.getState().clear();
});

describe('characterSheetStore persist migrate (RHA-01)', () => {
  it('rehydrates a v2 payload as v3: renames Faith->CVN and Occult->MYS, omits classAcquisitionLevel, keeps everything else', async () => {
    seedPersistedSheet(V2_STATE, 2);
    await useCharacterSheetStore.persist.rehydrate();

    const state = useCharacterSheetStore.getState();
    expect(state.name).toBe('Old Marcus');
    expect(state.level).toBe(8);
    expect(state.currentXP).toBe(250);
    expect(state.attributes.CVN).toBe(11);
    expect(state.attributes.MYS).toBe(14);
    expect(state.attributes.CON).toBe(12);
    expect(state.attributes.LUCK).toBe(5);
    expect((state as unknown as Record<string, unknown>).classAcquisitionLevel).toBeUndefined();

    // Persists the migrated v3 shape back to storage (migrated: true -> setItem runs).
    const raw = rawStoredBlob();
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw as string);
    expect(persisted.version).toBe(3);
    expect(persisted.state.attributes.CVN).toBe(11);
    expect(persisted.state.attributes.Faith).toBeUndefined();
  });

  it('shows a status (not alert) notice on a successful migration', async () => {
    seedPersistedSheet(V2_STATE, 2);
    await useCharacterSheetStore.persist.rehydrate();

    const notice = useSheetMigrationNoticeStore.getState().notice;
    expect(notice.status).toBe('migrated');
  });

  it('rejects a malformed v2 payload (attributes block missing) and leaves the raw payload untouched', async () => {
    const malformed = { name: 'Broken', level: 1 }; // no attributes block at all
    seedPersistedSheet(malformed, 2);
    const before = rawStoredBlob();

    await useCharacterSheetStore.persist.rehydrate();

    // Rejected: store falls back to in-memory defaults (migrate threw, so
    // `set()` never ran — verifying via the untouched-storage assertion
    // below is the load-bearing check, not the in-memory state).
    const state = useCharacterSheetStore.getState();
    expect(state.name).toBe('');

    // The raw saved payload must be byte-for-byte unchanged — migrate
    // throwing means zustand's persist middleware never calls setItem.
    expect(rawStoredBlob()).toBe(before);
  });

  it('rejects an unrecognized future version (v4) without guessing a shape, and leaves storage untouched', async () => {
    const future = { name: 'Future Marcus', level: 20, someNewField: { a: 1 } };
    seedPersistedSheet(future, 4);
    const before = rawStoredBlob();

    await useCharacterSheetStore.persist.rehydrate();

    expect(useCharacterSheetStore.getState().name).toBe('');
    expect(rawStoredBlob()).toBe(before);
  });

  it('shows an alert (not status) notice on a rejected/unsupported migration', async () => {
    seedPersistedSheet({ name: 'Future Marcus' }, 4);
    await useCharacterSheetStore.persist.rehydrate();

    const notice = useSheetMigrationNoticeStore.getState().notice;
    expect(notice.status).toBe('rejected');
  });

  it('never invented v1 or v0 handling: an unmapped old version behaves identically to an unknown future one', async () => {
    seedPersistedSheet({ name: 'Ancient' }, 1);
    const before = JSON.stringify({ state: { name: 'Ancient' }, version: 1 });
    localStorage.setItem(STORAGE_KEY, before);

    await useCharacterSheetStore.persist.rehydrate();

    expect(useCharacterSheetStore.getState().name).toBe('');
    expect(rawStoredBlob()).toBe(before);
    expect(useSheetMigrationNoticeStore.getState().notice.status).toBe('rejected');
  });
});
