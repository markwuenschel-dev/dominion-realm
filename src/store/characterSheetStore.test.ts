import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCharacterSheetStore } from './characterSheetStore';

/**
 * Persist rehydration is an external-input path (audit CAND-38). Same-version
 * blobs must pass through parseSheetImport: invalid documents keep the current
 * (default) sheet, valid partials apply only the parsed fields.
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';
const PERSIST_VERSION = 3;

function seedPersistedSheet(state: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: PERSIST_VERSION }));
}

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
});

describe('characterSheetStore persist merge', () => {
  it("does not apply an invalid same-version blob (species 'Dragon')", async () => {
    seedPersistedSheet({ species: 'Dragon' });
    await useCharacterSheetStore.persist.rehydrate();

    const { species, name, level } = useCharacterSheetStore.getState();
    expect(species).toBe('Human');
    expect(name).toBe('');
    expect(level).toBe(1);
  });

  it('hydrates valid parsed fields { name, level }', async () => {
    seedPersistedSheet({ name: 'Marcus', level: 12 });
    await useCharacterSheetStore.persist.rehydrate();

    const { name, level, species } = useCharacterSheetStore.getState();
    expect(name).toBe('Marcus');
    expect(level).toBe(12);
    expect(species).toBe('Human');
  });
});
