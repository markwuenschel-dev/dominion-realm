// ─────────────────────────────────────────────────────────────────────────────
// store/characterSheetStore.ts
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CharacterSheetState, SheetAttributeKey } from '@/types/characterSheet';
import { ATTRIBUTE_BASELINE } from '@/lib/formulas/pointBudget';
import type { SpeciesKey, SoulLevelKey } from '@/lib/characterTemplates';
import type { ClassKey } from '@/lib/classTaxonomy';
import { parseSheetImport } from '@/lib/sheetImport';
import { safeGet, safeRemove, safeSet } from '@/lib/safeStorage';
import {
  SHEET_STORAGE_KEY,
  quarantineRejectedSheet,
  readRawPersistedSheet,
} from '@/lib/sheetRecovery';
import { useSheetMigrationNoticeStore } from './sheetMigrationNoticeStore';

interface CharacterSheetActions {
  setName: (name: string) => void;
  setLevel: (level: number) => void;
  setSpecies: (species: SpeciesKey) => void;
  setClassName: (className: ClassKey) => void;
  setSoulLevel: (level: SoulLevelKey) => void;
  setAttribute: (key: SheetAttributeKey, value: number) => void;
  setConditionMod: (key: 'HP' | 'Mana' | 'Stamina' | 'Reserve', value: number) => void;
  setCurrentResource: (key: 'HP' | 'Mana' | 'Stamina' | 'Reserve', value: number) => void;
  setCurrentXP: (xp: number) => void;
  resetToDefaults: () => void;
  /** Replace the full sheet state — used by profile loader and JSON import. */
  loadState: (partial: Partial<CharacterSheetState>) => void;
}

type CharacterSheetStore = CharacterSheetState & CharacterSheetActions;

// Level 1 baseline — every attribute starts at the all-5s point-buy baseline.
const DEFAULT_STATE: CharacterSheetState = {
  name: '',
  level: 1,
  species: 'Human',
  className: 'None',
  soulLevel: 'Common',
  attributes: {
    CON: ATTRIBUTE_BASELINE,
    END: ATTRIBUTE_BASELINE,
    STR: ATTRIBUTE_BASELINE,
    AGI: ATTRIBUTE_BASELINE,
    DEX: ATTRIBUTE_BASELINE,
    INT: ATTRIBUTE_BASELINE,
    WIS: ATTRIBUTE_BASELINE,
    CHA: ATTRIBUTE_BASELINE,
    CVN: ATTRIBUTE_BASELINE,
    MYS: ATTRIBUTE_BASELINE,
    LUCK: ATTRIBUTE_BASELINE,
  },
  conditionMods: { HP: 1.0, Mana: 1.0, Stamina: 1.0, Reserve: 1.0 },
  currentResources: { HP: 50, Mana: 50, Stamina: 50, Reserve: 40 },
  currentXP: 0,
};

/**
 * v2 -> v3 migration (audit RHA-01): the only evidenced, reconstructable
 * shape delta between persisted versions (commit 2fe196e) is
 * attributes.Faith -> CVN, attributes.Occult -> MYS (pure rename, no
 * coefficient change), and the removal of the top-level
 * classAcquisitionLevel field. No v0/v1 ever existed — v2 was the first
 * persisted shape (v0 was zustand's implicit default before `version` was
 * ever set) — and no future version is guessed at here.
 *
 * Reads the RAW pre-validation payload (persistedState is `unknown`) to
 * pull the old field names, maps them, then validates the mapped result
 * through the same schema gate (parseSheetImport) that every other
 * external-input path already goes through (CAND-38) before accepting it.
 * Returns null (never guesses) when the raw shape doesn't look like a v2
 * payload at all.
 */
function migrateV2ToV3(raw: unknown): Partial<CharacterSheetState> | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const rawAttributes = r.attributes;
  if (rawAttributes == null || typeof rawAttributes !== 'object') return null;
  const a = rawAttributes as Record<string, unknown>;

  const mapped = {
    name: r.name,
    level: r.level,
    species: r.species,
    className: r.className,
    soulLevel: r.soulLevel,
    attributes: {
      CON: a.CON,
      END: a.END,
      STR: a.STR,
      AGI: a.AGI,
      DEX: a.DEX,
      INT: a.INT,
      WIS: a.WIS,
      CHA: a.CHA,
      CVN: a.Faith, // renamed
      MYS: a.Occult, // renamed
      LUCK: a.LUCK,
    },
    conditionMods: r.conditionMods,
    currentXP: r.currentXP,
    // classAcquisitionLevel deliberately dropped -- removed in v3.
  };

  return parseSheetImport(mapped);
}

/**
 * Persist `migrate`. Critical correctness property, verified directly
 * against zustand v5's persist middleware (node_modules/zustand/esm/
 * middleware.mjs): returning `undefined` for an unsupported/invalid input
 * still counts as a successful migration internally, which immediately
 * persists `merge(undefined, currentState)` -- i.e. defaults -- back over
 * the raw saved payload, destroying it permanently. Throwing instead
 * rejects zustand's internal hydration promise chain, which skips
 * `merge`/`setItem` entirely: the in-memory store falls back to its
 * already-initialized defaults, but the raw payload in storage is never
 * touched and stays recoverable.
 *
 * Records the outcome in the separate, unpersisted notice store (see
 * sheetMigrationNoticeStore.ts for why it must not live on this store)
 * before returning or throwing.
 */
function migrate(persistedState: unknown, version: number): Partial<CharacterSheetState> {
  if (version === 2) {
    const mapped = migrateV2ToV3(persistedState);
    if (mapped != null) {
      useSheetMigrationNoticeStore
        .getState()
        .setMigrated('Your saved sheet was updated to the latest format.');
      return mapped;
    }
  }
  rejectPersistedSheet();
  throw new Error(`Unsupported or invalid saved character sheet (version ${version})`);
}

/**
 * The single rejection contract, shared by both paths that can refuse a saved
 * sheet: `migrate` (unsupported or unmigratable version) and `merge` (a
 * same-version blob that fails the schema).
 *
 * To a reader those are one fact — "your saved sheet did not load" — but they
 * previously produced opposite amounts of explanation: `migrate` alerted and
 * threw, `merge` returned defaults in silence. Worse, they had different
 * *durability*. `migrate`'s throw stops zustand writing over the raw payload;
 * `merge` returns successfully, so the reader's next keystroke persists defaults
 * over it. Routing both through here makes preservation the precondition rather
 * than a side effect of which callback happened to run.
 *
 * Order matters and is the whole point: **preserve first, then decide whether a
 * writable sheet may exist at all.** If the raw envelope cannot be quarantined,
 * admitting a writable sheet would let the reader overwrite their only copy — so
 * persistence is disabled for the session instead, and the notice says so.
 */
function rejectPersistedSheet(): void {
  const notices = useSheetMigrationNoticeStore.getState();
  const outcome = quarantineRejectedSheet(readRawPersistedSheet());

  if (outcome.status === 'failed') {
    notices.setPersistenceUnavailable(
      'Your saved sheet could not be loaded, and this browser is not allowing anything to be saved. ' +
        'You can keep working, but nothing will be kept when you leave.',
    );
    return;
  }

  notices.setRejected(
    'Your saved sheet could not be loaded. A copy has been kept so you can download it below.',
  );
}

export const useCharacterSheetStore = create<CharacterSheetStore>()(
  devtools(
    persist(
      (set) => ({
        ...DEFAULT_STATE,

        setName: (name) => set({ name }, false, 'setName'),
        setLevel: (level) => set({ level: Math.max(1, Math.min(50, level)) }, false, 'setLevel'),
        setSpecies: (species) => set({ species }, false, 'setSpecies'),
        setClassName: (className) => set({ className }, false, 'setClassName'),
        setSoulLevel: (soulLevel) => set({ soulLevel }, false, 'setSoulLevel'),

        setAttribute: (key, value) =>
          set(
            (state) => ({
              attributes: { ...state.attributes, [key]: Math.max(1, Math.min(30, value)) },
            }),
            false,
            `setAttribute/${key}`,
          ),

        setConditionMod: (key, value) =>
          set(
            (state) => ({ conditionMods: { ...state.conditionMods, [key]: value } }),
            false,
            `setConditionMod/${key}`,
          ),

        setCurrentResource: (key, value) =>
          set(
            (state) => ({
              currentResources: { ...state.currentResources, [key]: Math.max(0, value) },
            }),
            false,
            `setCurrentResource/${key}`,
          ),

        setCurrentXP: (currentXP) =>
          set({ currentXP: Math.max(0, currentXP) }, false, 'setCurrentXP'),

        resetToDefaults: () => set({ ...DEFAULT_STATE }, false, 'resetToDefaults'),

        loadState: (partial) =>
          set(
            {
              ...DEFAULT_STATE,
              ...partial,
              conditionMods: partial.conditionMods ?? DEFAULT_STATE.conditionMods,
            },
            false,
            'loadState',
          ),
      }),
      {
        name: SHEET_STORAGE_KEY,
        version: 3, // bumped for Faith→CVN/Occult→MYS rename + classAcquisitionLevel removal
        migrate,
        /**
         * Hydration is owned by the sheet's render entry point, not by module
         * import. Server and first client render must agree, and they cannot
         * while the store rehydrates itself the moment this module loads —
         * that is the `/sheet` mismatch: the server renders defaults while the
         * client has already read storage.
         *
         * See CharacterSheetShell for the boundary that calls `rehydrate()` and,
         * critically, releases the UI in a `finally`. Zustand catches the throw
         * from a rejected `migrate` without ever setting `hasHydrated` or firing
         * finish-hydration listeners, so anything that waits on those signals
         * hangs forever on exactly the path this design exists to serve.
         */
        skipHydration: true,
        /**
         * Every access goes through the guarded seam, and every write asks the
         * notice store whether persistence is still permitted. A rejected sheet
         * that could not be quarantined disables writes here rather than relying
         * on any component remembering not to save.
         */
        storage: {
          getItem: (name) => {
            const raw = safeGet(name).value;
            if (raw === null) return null;
            try {
              return JSON.parse(raw) as ReturnType<
                NonNullable<Parameters<typeof persist>[1]['storage']>['getItem']
              >;
            } catch {
              // Unparseable at the envelope level — not even `{state,version}`.
              // This is still the reader's sheet: a truncated write or a damaged
              // profile is exactly the payload they would want back.
              //
              // Returning null alone was a data-loss path. `merge` and `migrate`
              // never run for an absent value, so neither rejection path fired,
              // nothing was quarantined, no notice appeared, and writes stayed
              // enabled — the next edit overwrote the corrupted-but-recoverable
              // bytes. Run the same rejection contract here so a malformed
              // envelope is preserved on the terms every other rejection gets.
              rejectPersistedSheet();
              return null;
            }
          },
          setItem: (name, value) => {
            if (useSheetMigrationNoticeStore.getState().persistenceDisabled) return;
            const written = safeSet(name, JSON.stringify(value));
            if (!written.ok) {
              // An ordinary write failure, with no rejected sheet anywhere in
              // sight: a first-time reader in a storage-blocked browser, or a
              // reader whose storage was revoked or filled mid-session. Both
              // previously failed in silence, so someone could author a whole
              // sheet and find on return that it had never been saved.
              //
              // Reader-authored data does not get silent degradation, so this
              // says so and stops pretending later writes will work.
              useSheetMigrationNoticeStore
                .getState()
                .setPersistenceUnavailable(
                  'This browser is not allowing anything to be saved, so your sheet will not be ' +
                    'kept when you leave. You can keep working, and you can download it below.',
                );
            }
          },
          removeItem: (name) => {
            safeRemove(name);
          },
        },
        // currentResources is transient — not persisted
        partialize: (state) => ({
          name: state.name,
          level: state.level,
          species: state.species,
          className: state.className,
          soulLevel: state.soulLevel,
          attributes: state.attributes,
          conditionMods: state.conditionMods,
          currentXP: state.currentXP,
        }),
        // Same-version blobs are schema-gated (CAND-38). Missing/invalid → keep
        // current — but no longer *silently*: an invalid same-version blob is
        // the same reader-facing failure as an unmigratable one, and previously
        // this branch returned defaults with no notice and no preservation,
        // leaving the next keystroke free to overwrite the payload.
        merge: (persistedState, currentState) => {
          if (persistedState == null) return currentState;
          const parsed = parseSheetImport(persistedState);
          if (parsed == null) {
            rejectPersistedSheet();
            return currentState;
          }
          return { ...currentState, ...parsed };
        },
      },
    ),
    { name: 'CharacterSheet' },
  ),
);
