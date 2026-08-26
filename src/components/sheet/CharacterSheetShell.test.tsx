import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CharacterSheetShell } from './CharacterSheetShell';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { useSheetMigrationNoticeStore } from '@/store/sheetMigrationNoticeStore';

/**
 * CharacterSheetShell (audit RHA-08) has exactly two observable
 * responsibilities: compose StatSheetTable, and render the footer. This is a
 * composition contract, not a coverage-number exercise — StatSheetTable's own
 * behavior is covered in StatSheetTable.test.tsx.
 *
 * RHA-01 adds a third: surfacing the persist-migration notice. Success and
 * rejection are required to render distinct ARIA roles (status vs alert) —
 * that UI contract is exercised directly here via the notice store, rather
 * than by driving a real hydration cycle (characterSheetStore.migration.test.ts
 * already covers that the store sets the right notice for each outcome).
 *
 * Campaign Q44 adds a fourth: the shell now OWNS hydration. The store sets
 * `skipHydration`, so the table is gated behind a readiness flag and appears
 * only after the shell's boundary resolves. The gate must release on every
 * outcome — see the rejection case below, which is the path that would hang
 * forever if readiness were tied to zustand's `hasHydrated`.
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
  useSheetMigrationNoticeStore.getState().resetForTests();
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
  useSheetMigrationNoticeStore.getState().resetForTests();
});

describe('CharacterSheetShell', () => {
  it('composes the real StatSheetTable once hydration resolves', async () => {
    render(<CharacterSheetShell />);
    // Proof it's the real child, not a stub: an interactive field only
    // StatSheetTable renders. Awaited because the shell now hydrates first.
    expect(await screen.findByPlaceholderText('Character name')).toBeInTheDocument();
  });

  it('releases the gate on a REJECTED sheet, while hasHydrated is still false', async () => {
    // The blocking case, stated as the trap rather than the symptom. Measured:
    // a thrown `migrate` still RESOLVES rehydrate() but leaves hasHydrated()
    // false forever. Asserting both together is what makes this test fail for
    // any implementation that gates readiness on the flag instead of the
    // promise — the version that leaves /sheet permanently skeletonised.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { nope: true }, version: 2 }));

    render(<CharacterSheetShell />);

    expect(await screen.findByPlaceholderText('Character name')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(useCharacterSheetStore.persist.hasHydrated()).toBe(false);
  });

  it('renders the footer attribution', () => {
    render(<CharacterSheetShell />);
    expect(
      screen.getByText('Dominion Realm · Stat Sheet · formula lock (src/lib/formulas)'),
    ).toBeInTheDocument();
  });

  it('renders no migration notice when idle', () => {
    render(<CharacterSheetShell />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a status (not alert) role on a successful migration', () => {
    useSheetMigrationNoticeStore.getState().setMigrated('Your saved sheet was updated.');
    render(<CharacterSheetShell />);
    expect(screen.getByRole('status')).toHaveTextContent('Your saved sheet was updated.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an alert (not status) role on a rejected migration', () => {
    useSheetMigrationNoticeStore.getState().setRejected('Your saved sheet could not be loaded.');
    render(<CharacterSheetShell />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your saved sheet could not be loaded.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
