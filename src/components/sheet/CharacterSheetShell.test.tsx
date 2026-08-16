import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CharacterSheetShell } from './CharacterSheetShell';
import { useCharacterSheetStore } from '@/store/characterSheetStore';

/**
 * CharacterSheetShell (audit RHA-08) has exactly two observable
 * responsibilities: compose StatSheetTable, and render the footer. This is a
 * composition contract, not a coverage-number exercise — StatSheetTable's own
 * behavior is covered in StatSheetTable.test.tsx.
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
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
});
