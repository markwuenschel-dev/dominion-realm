import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';

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

describe('CharacterSheetShell', () => {
  it('composes the real StatSheetTable', () => {
    render(<CharacterSheetShell />);
    // Proof it's the real child, not a stub: an interactive field only
    // StatSheetTable renders.
    expect(screen.getByPlaceholderText('Character name')).toBeInTheDocument();
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
