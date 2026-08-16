import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatSheetTable } from './StatSheetTable';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { ATTRIBUTE_BASELINE } from '@/lib/formulas/pointBudget';
import type { CharacterSheetAttributes } from '@/types/characterSheet';

/**
 * Coverage for the interactive character-sheet table (audit RHA-08). Tests
 * against the real Zustand store and the real useCharacterSheet derivation
 * chain — mocking either would assert a fabricated view model rather than
 * the actual UI -> store -> derivation -> render seam. Store and its
 * localStorage persistence key are reset in beforeEach/afterEach so tests
 * never leak state into one another.
 *
 * Accessibility caveat (recorded, not fixed here — a separate repair):
 * the sheet's field labels are plain <p> elements, not <label for> or
 * aria-labelledby associations. Name/Level/XP inputs and the three
 * Race/Class/Soul-Level Selects have no accessible name distinguishing
 * them from one another, so several queries below fall back to DOM
 * position (documented at each use) rather than role+name. This test
 * file does not touch the component's markup to fix that.
 */

const STORAGE_KEY = 'dominion-realm-character-sheet';

/** All-baseline (5) attribute set, all 11 sheet keys, for seeding a partial
 *  override via spread (e.g. `{ ...DEFAULT_ATTRS, STR: 15 }`). */
const DEFAULT_ATTRS: CharacterSheetAttributes = {
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
};

// Radix Select relies on Pointer Events APIs jsdom does not implement.
beforeAll(() => {
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

/** Level input has both min and max attributes; XP input has only min. Both
 *  are unlabeled number inputs in the Identity row (accessibility caveat
 *  above), so this is the least-brittle available selector. */
function getLevelInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="number"][max]') as HTMLInputElement;
}
function getXpInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="number"]:not([max])') as HTMLInputElement;
}

/** The effective (class-scaled, rounded) value displayed in one attribute's
 *  cell, read via the cell's own +/- button aria-labels (which ARE real
 *  accessible names) rather than by DOM position. */
function attrEffectiveValue(attrKey: string): number {
  const td = screen.getByRole('button', { name: `Increase ${attrKey}` }).closest('td')!;
  return Number(td.querySelector('.stat-value')!.textContent);
}
function attrBadgeText(attrKey: string): string | null {
  const td = screen.getByRole('button', { name: `Increase ${attrKey}` }).closest('td')!;
  return td.querySelector('span.text-\\[9px\\].text-primary')?.textContent ?? null;
}

/** A resource stat's displayed final value (HP/Mana/Stamina/Reserve), read
 *  via its own field label -- exact match, so this never collides with the
 *  "Reserve ×{soulMult}" text elsewhere on the page. */
function resourceValue(label: 'HP' | 'Mana' | 'Stamina' | 'Reserve'): number {
  const displayLabel = label === 'HP' ? 'Health' : label;
  const labelEl = screen.getByText(displayLabel, { selector: 'p' });
  return Number(labelEl.parentElement!.querySelector('.stat-value')!.textContent);
}

describe('StatSheetTable — identity fields', () => {
  it('name input updates the displayed value', async () => {
    const user = userEvent.setup();
    render(<StatSheetTable />);
    const nameInput = screen.getByPlaceholderText('Character name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Aria Nightshade');
    expect(nameInput).toHaveValue('Aria Nightshade');
  });

  it('level input clamps to the 1-50 range, reflected in the displayed value', () => {
    const { container } = render(<StatSheetTable />);
    const levelInput = getLevelInput(container);
    expect(levelInput).toHaveValue(1);

    fireEvent.change(levelInput, { target: { value: '999' } });
    expect(getLevelInput(container)).toHaveValue(50);

    fireEvent.change(getLevelInput(container), { target: { value: '-5' } });
    expect(getLevelInput(container)).toHaveValue(1);
  });

  it('current-XP input clamps to zero, reflected in the displayed value', () => {
    const { container } = render(<StatSheetTable />);
    const xpInput = getXpInput(container);
    expect(xpInput).toHaveValue(0);

    fireEvent.change(xpInput, { target: { value: '-500' } });
    expect(getXpInput(container)).toHaveValue(0);
  });
});

describe('StatSheetTable — attribute cells', () => {
  it('increment/decrement update the displayed effective value by 1 (no class, Neutral 1.0x, no badge)', async () => {
    const user = userEvent.setup();
    render(<StatSheetTable />);
    expect(attrEffectiveValue('STR')).toBe(ATTRIBUTE_BASELINE);
    expect(attrBadgeText('STR')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Increase STR' }));
    expect(attrEffectiveValue('STR')).toBe(ATTRIBUTE_BASELINE + 1);

    await user.click(screen.getByRole('button', { name: 'Decrease STR' }));
    await user.click(screen.getByRole('button', { name: 'Decrease STR' }));
    expect(attrEffectiveValue('STR')).toBe(ATTRIBUTE_BASELINE - 1);
  });

  it('Warrior class (STR is Prime, x1.15) shows the multiplier badge and scaled effective value', async () => {
    const user = userEvent.setup();
    render(<StatSheetTable />);
    // Comboboxes render in DOM order Race, Class, Soul Level (accessibility
    // caveat above — none carries a distinguishing accessible name).
    const classCombobox = screen.getAllByRole('combobox')[1];
    await user.click(classCombobox);
    await user.click(await screen.findByRole('option', { name: 'Warrior' }));

    expect(attrBadgeText('STR')).toBe('×1.15');
    expect(attrEffectiveValue('STR')).toBe(Math.round(ATTRIBUTE_BASELINE * 1.15));
  });
});

describe('StatSheetTable — Unique-tier XP state', () => {
  it("renders the intentional '—' undefined-progression state, not 0 or NaN, for a Unique class", () => {
    // Unique classes are deliberately excluded from the Class picker
    // (classTaxonomy.ts PICKER_RARITIES) — unreachable via the Select UI by
    // design, so this exceptional state is seeded directly on the store as
    // test setup, per the reviewed testing approach; the assertion below is
    // still on rendered DOM, not store state.
    act(() => {
      useCharacterSheetStore.getState().setClassName('FirstWoundOfHeaven');
    });
    render(<StatSheetTable />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2); // percent-to-next-level AND xpNextLabel
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});

describe('StatSheetTable — point budget', () => {
  it('shows "N remaining" at the default (under-budget) state', () => {
    render(<StatSheetTable />);
    expect(screen.getByText(/remaining$/)).toBeInTheDocument();
    expect(screen.queryByText(/over budget$/)).not.toBeInTheDocument();
  });

  it('shows "N over budget" once spending exceeds the level-1 pool (seeded, not clicked)', () => {
    // Exceptional state seeded directly on the store before render, per the
    // reviewed testing approach -- avoids a 40-click loop for a setup
    // condition, not the behavior under test. Human/level 1 grants 4 free
    // points (level x pointsPerLevel); STR alone at 15 spends 10 (15-5),
    // 6 over the pool.
    act(() => {
      useCharacterSheetStore.getState().loadState({
        attributes: { ...DEFAULT_ATTRS, STR: 15 },
      });
    });
    render(<StatSheetTable />);

    expect(screen.getByText(/over budget$/)).toBeInTheDocument();
    expect(screen.queryByText(/remaining$/)).not.toBeInTheDocument();
  });
});

describe('StatSheetTable — attribute boundary clamp (UI-driven, no loops)', () => {
  it('Decrease STR at the floor (1) stays at 1', async () => {
    const user = userEvent.setup();
    act(() => {
      useCharacterSheetStore.getState().loadState({ attributes: { ...DEFAULT_ATTRS, STR: 1 } });
    });
    render(<StatSheetTable />);
    expect(attrEffectiveValue('STR')).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Decrease STR' }));
    expect(attrEffectiveValue('STR')).toBe(1);
  });

  it('Increase STR at the ceiling (30) stays at 30', async () => {
    const user = userEvent.setup();
    act(() => {
      useCharacterSheetStore.getState().loadState({ attributes: { ...DEFAULT_ATTRS, STR: 30 } });
    });
    render(<StatSheetTable />);
    expect(attrEffectiveValue('STR')).toBe(30);

    await user.click(screen.getByRole('button', { name: 'Increase STR' }));
    expect(attrEffectiveValue('STR')).toBe(30);
  });
});

describe('StatSheetTable — cast profile loader', () => {
  it('loading Marcus changes visible sheet fields and disables the loader afterward', async () => {
    const user = userEvent.setup();
    render(<StatSheetTable />);

    const profileCombobox = screen.getAllByRole('combobox')[3]; // Race, Class, Soul Level, then Cast profile
    await user.click(profileCombobox);
    await user.click(await screen.findByRole('option', { name: /Marcus Vye/ }));

    const loadButton = screen.getByRole('button', { name: /^Load/ });
    expect(loadButton).toBeEnabled();
    await user.click(loadButton);

    expect(screen.getByPlaceholderText('Character name')).toHaveValue('Marcus Vye');
    const classCombobox = screen.getAllByRole('combobox')[1];
    expect(classCombobox).toHaveTextContent('Mage');
    expect(loadButton).toBeDisabled();
  });
});

describe('StatSheetTable — export', () => {
  it('creates an object URL from a Blob of the persisted fields, names the file, clicks the anchor, and revokes the URL', async () => {
    const user = userEvent.setup();
    const mockUrl = 'blob:nodedata:test-fixed-uuid';
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let clickedHref: string | undefined;
    let clickedDownload: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        clickedHref = this.href;
        clickedDownload = this.download;
      },
    );

    render(<StatSheetTable />);
    const nameInput = screen.getByPlaceholderText('Character name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Aria');

    await user.click(screen.getByRole('button', { name: '↓ Export' }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    const payload = JSON.parse(await blobArg.text());
    expect(payload).toMatchObject({
      name: 'Aria',
      level: 1,
      species: 'Human',
      className: 'None',
      soulLevel: 'Common',
      currentXP: 0,
    });
    expect(payload).toHaveProperty('attributes');
    expect(payload).toHaveProperty('conditionMods');
    expect(payload).not.toHaveProperty('currentResources');

    expect(clickedDownload).toBe('Aria-sheet.json');
    expect(clickedHref).toBe(mockUrl);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl);
  });
});

describe('StatSheetTable — import', () => {
  it('clicking the visible Import button invokes the hidden file input, proving that click-through path', async () => {
    const user = userEvent.setup();
    const { container } = render(<StatSheetTable />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

    await user.click(screen.getByRole('button', { name: '↑ Import' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('a valid imported file updates the sheet (real File + real FileReader, awaited to completion)', async () => {
    const user = userEvent.setup();
    const { container } = render(<StatSheetTable />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File([JSON.stringify({ name: 'Imported Hero', level: 5 })], 'sheet.json', {
      type: 'application/json',
    });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Character name')).toHaveValue('Imported Hero');
    });
    expect(getLevelInput(container)).toHaveValue(5);
  });

  it('a malformed file is caught and leaves the sheet unchanged (deterministic fake FileReader, awaited to completion)', async () => {
    const user = userEvent.setup();
    const { container } = render(<StatSheetTable />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // The real FileReader's readAsText is asynchronous with no promise this
    // test can await; an immediate post-upload assertion could pass before
    // onload ever runs. A controllable fake gives a deterministic completion
    // barrier for this one negative case — it replaces a browser boundary,
    // not an internal collaborator (parseSheetImport itself is untouched and
    // already fully unit-tested elsewhere).
    class DeterministicFakeFileReader {
      onload: ((ev: { target: { result: string } }) => void) | null = null;
      result: string | null = null;
      readAsText() {
        this.result = 'not valid json {{{';
        queueMicrotask(() => this.onload?.({ target: { result: this.result! } }));
      }
    }
    const OriginalFileReader = globalThis.FileReader;
    // @ts-expect-error -- deliberately substituting a minimal fake for one test
    globalThis.FileReader = DeterministicFakeFileReader;

    try {
      const file = new File(['irrelevant — the fake reader ignores real content'], 'bad.json', {
        type: 'application/json',
      });
      await user.upload(fileInput, file);
      // Flush the fake reader's queued microtask.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByPlaceholderText('Character name')).toHaveValue('');
      expect(getLevelInput(container)).toHaveValue(1);
    } finally {
      globalThis.FileReader = OriginalFileReader;
    }
  });
});

describe('StatSheetTable — export/import round-trip', () => {
  it('exporting the current sheet and re-importing that exact file restores every persisted field', async () => {
    const user = userEvent.setup();

    // A distinctive, nonuniform state across every persisted field —
    // export and import can each pass their own isolated test while the
    // shared data contract between them is silently broken; only a real
    // round-trip proves the two sides agree with each other.
    act(() => {
      useCharacterSheetStore.getState().loadState({
        name: 'Round Trip Hero',
        level: 7,
        species: 'Dwarf',
        className: 'Mage',
        soulLevel: 'Radiant',
        attributes: {
          CON: 8,
          END: 9,
          STR: 6,
          AGI: 10,
          DEX: 7,
          INT: 14,
          WIS: 12,
          CHA: 6,
          CVN: 8,
          MYS: 9,
          LUCK: 11,
        },
        conditionMods: { HP: 0.9, Mana: 1.1, Stamina: 1.0, Reserve: 0.95 },
        currentXP: 250,
      });
    });

    const mockUrl = 'blob:nodedata:round-trip-uuid';
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { container } = render(<StatSheetTable />);

    // Reserve is affected by both a per-resource conditionMod AND the
    // soul-level multiplier (Reserve alone, per the resource chain) — the
    // resource least likely to round-trip correctly by accident. Captured
    // from the live DOM before mutation, not hand-computed, so the
    // assertion is a true round-trip equality rather than a re-derivation
    // of the formula.
    const reserveBefore = resourceValue('Reserve');
    // MYS's effective value depends on Mage's role multiplier for MYS
    // (Prime/Core/Secondary), which this test isn't asserting a specific
    // value for -- captured live rather than hand-computed, same reasoning
    // as reserveBefore.
    const mysEffectiveBefore = attrEffectiveValue('MYS');

    await user.click(screen.getByRole('button', { name: '↓ Export' }));
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const exportedBlob = createObjectURLSpy.mock.calls[0][0] as Blob;
    const exportedText = await exportedBlob.text();

    // Deliberately mutate the rendered sheet away from the exported state
    // before restoring, so a passing test proves real restoration, not
    // "nothing happened to notice."
    act(() => {
      useCharacterSheetStore.getState().resetToDefaults();
    });
    expect(screen.getByPlaceholderText('Character name')).toHaveValue('');

    const roundTripFile = new File([exportedText], 'round-trip.json', {
      type: 'application/json',
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, roundTripFile);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Character name')).toHaveValue('Round Trip Hero');
    });
    expect(getLevelInput(container)).toHaveValue(7);
    expect(getXpInput(container)).toHaveValue(250);
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Dwarf');
    expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('Mage');
    expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('Radiant');
    expect(attrEffectiveValue('MYS')).toBe(mysEffectiveBefore);
    expect(resourceValue('Reserve')).toBe(reserveBefore);

    // currentResources is intentionally transient -- excluded from both
    // persistence and export -- so it is explicitly NOT asserted here.
  });
});

describe('StatSheetTable — reset', () => {
  it('restores the default state after fields have been changed', async () => {
    const user = userEvent.setup();
    const { container } = render(<StatSheetTable />);

    const nameInput = screen.getByPlaceholderText('Character name');
    await user.type(nameInput, 'Temporary');
    await user.click(screen.getByRole('button', { name: 'Increase STR' }));
    expect(attrEffectiveValue('STR')).toBe(ATTRIBUTE_BASELINE + 1);

    await user.click(screen.getByRole('button', { name: '↺ Reset to Level 1' }));

    expect(screen.getByPlaceholderText('Character name')).toHaveValue('');
    expect(getLevelInput(container)).toHaveValue(1);
    expect(attrEffectiveValue('STR')).toBe(ATTRIBUTE_BASELINE);
  });
});
