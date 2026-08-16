import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatSheetTable } from './StatSheetTable';
import { useCharacterSheetStore } from '@/store/characterSheetStore';

/**
 * RHA-13: handleImport's FileReader had no onerror handler, and even its
 * onload path was silent on both a read failure and a malformed/invalid
 * file — the only signal was a console.warn buried in parseSheetImport for
 * the schema-rejection case specifically. All three failed-import paths
 * (read error, malformed JSON, schema rejection) now surface one visible,
 * accessible message beside the import controls, cleared on the next file
 * selection or on a successful import.
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';

beforeAll(() => {
  // Radix Select renders unconditionally in StatSheetTable; jsdom lacks
  // these pointer-capture APIs regardless of whether a test interacts with
  // the Select directly.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  useCharacterSheetStore.getState().resetToDefaults();
  vi.restoreAllMocks();
});

function getImportInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('import file input not found');
  return input as HTMLInputElement;
}

function getNameInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Character name') as HTMLInputElement;
}

// A minimal, schema-valid import document — enough to exercise the
// success path without depending on any other candidate's fixtures.
const VALID_IMPORT = {
  name: 'Imported Hero',
  level: 3,
  attributes: {
    CON: 6,
    END: 6,
    STR: 6,
    AGI: 6,
    DEX: 6,
    INT: 6,
    WIS: 6,
    CHA: 6,
    CVN: 6,
    MYS: 6,
    LUCK: 6,
  },
};

/**
 * Deterministic FileReader stand-in for the read-error branch. Real
 * FileReader never fails on a well-formed in-memory File in jsdom, so the
 * only way to exercise `reader.onerror` at all is to control the reader
 * itself — this boundary fake fires onerror instead of onload,
 * synchronously, under an explicit act() flush.
 */
class FailingFileReader {
  public onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;
  public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;
  public error = new DOMException('boundary fake read failure', 'NotReadableError');
  readAsText() {
    queueMicrotask(() => {
      this.onerror?.call(
        this as unknown as FileReader,
        new ProgressEvent('error') as ProgressEvent<FileReader>,
      );
    });
  }
}

describe('StatSheetTable — import failure feedback (RHA-13)', () => {
  it('shows a visible message and leaves the sheet unchanged when the FileReader itself fails', async () => {
    render(<StatSheetTable />);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalFileReader = globalThis.FileReader;
    // @ts-expect-error -- deliberate boundary substitution for this one test
    globalThis.FileReader = FailingFileReader;

    try {
      const nameBefore = getNameInput().value;
      const file = new File(['irrelevant'], 'sheet.json', { type: 'application/json' });
      fireEvent.change(getImportInput(), { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Could not read that character sheet. Please try again.',
        );
      });
      expect(getNameInput().value).toBe(nameBefore);
      expect(warnSpy).toHaveBeenCalledWith(
        'Sheet import failed to read:',
        expect.any(DOMException),
      );
    } finally {
      // Restore even if an assertion above throws — otherwise every other
      // test in this file would inherit the patched FileReader.
      globalThis.FileReader = originalFileReader;
    }
  });

  it('shows a visible message when the file is not valid JSON', async () => {
    render(<StatSheetTable />);
    const nameBefore = getNameInput().value;
    const file = new File(['{ not valid json'], 'sheet.json', { type: 'application/json' });
    fireEvent.change(getImportInput(), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'That file is not a valid character sheet.',
      );
    });
    expect(getNameInput().value).toBe(nameBefore);
  });

  it('shows a visible message when the file is valid JSON but rejects the sheet schema', async () => {
    render(<StatSheetTable />);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nameBefore = getNameInput().value;
    const badShape = JSON.stringify({ attributes: { CON: 6 } }); // missing 10 of 11 keys
    const file = new File([badShape], 'sheet.json', { type: 'application/json' });
    fireEvent.change(getImportInput(), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'That file is not a valid character sheet.',
      );
    });
    expect(getNameInput().value).toBe(nameBefore);
    expect(warnSpy).toHaveBeenCalledWith('Sheet import rejected:', expect.anything());
  });

  it('clears a prior error as soon as a new file is selected', async () => {
    render(<StatSheetTable />);
    const badFile = new File(['{ not valid json'], 'sheet.json', { type: 'application/json' });
    fireEvent.change(getImportInput(), { target: { files: [badFile] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    const goodFile = new File([JSON.stringify(VALID_IMPORT)], 'sheet.json', {
      type: 'application/json',
    });
    fireEvent.change(getImportInput(), { target: { files: [goodFile] } });

    // Cleared synchronously on selection, before the (async) read resolves.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(getNameInput().value).toBe('Imported Hero'));
  });

  it('clears a prior error on a subsequent successful import, and the real FileReader happy path still works', async () => {
    render(<StatSheetTable />);
    const badFile = new File(['{ not valid json'], 'sheet.json', { type: 'application/json' });
    fireEvent.change(getImportInput(), { target: { files: [badFile] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    const goodFile = new File([JSON.stringify(VALID_IMPORT)], 'sheet.json', {
      type: 'application/json',
    });
    fireEvent.change(getImportInput(), { target: { files: [goodFile] } });

    await waitFor(() => expect(getNameInput().value).toBe('Imported Hero'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
