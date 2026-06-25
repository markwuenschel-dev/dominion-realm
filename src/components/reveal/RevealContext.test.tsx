import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealProvider, useReveal } from './RevealContext';
import { REVEAL_STORAGE_KEY } from '@/lib/reveal';

/**
 * Reveal state controller. Defaults to Teaser on the server / first paint (so
 * SSR HTML stays spoiler-safe), then restores the reader's persisted choice and
 * mirrors the level onto <html data-reveal> for CSS hooks. These tests pin that
 * lifecycle, which the SSR/no-hydration-mismatch guarantee depends on.
 */

function Probe() {
  const { level, setLevel } = useReveal();
  return (
    <div>
      <span data-testid="level">{level}</span>
      <button onClick={() => setLevel('deep')}>go deep</button>
    </div>
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.reveal;
});

describe('RevealProvider', () => {
  it('defaults to the spoiler-safe teaser tier', () => {
    render(
      <RevealProvider>
        <Probe />
      </RevealProvider>,
    );
    expect(screen.getByTestId('level')).toHaveTextContent('teaser');
  });

  it('restores a persisted tier from localStorage on mount', async () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'deep');
    render(
      <RevealProvider>
        <Probe />
      </RevealProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('deep'));
  });

  it('ignores a corrupt persisted value, staying at the default', async () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'not-a-tier');
    render(
      <RevealProvider>
        <Probe />
      </RevealProvider>,
    );
    await waitFor(() => expect(document.documentElement.dataset.reveal).toBe('teaser'));
    expect(screen.getByTestId('level')).toHaveTextContent('teaser');
  });

  it('persists setLevel to localStorage and mirrors it onto <html data-reveal>', async () => {
    const user = userEvent.setup();
    render(
      <RevealProvider>
        <Probe />
      </RevealProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'go deep' }));
    expect(screen.getByTestId('level')).toHaveTextContent('deep');
    expect(localStorage.getItem(REVEAL_STORAGE_KEY)).toBe('deep');
    await waitFor(() => expect(document.documentElement.dataset.reveal).toBe('deep'));
  });

  it('stays at the safe default when storage access throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    render(
      <RevealProvider>
        <Probe />
      </RevealProvider>,
    );
    await waitFor(() => expect(document.documentElement.dataset.reveal).toBe('teaser'));
    expect(screen.getByTestId('level')).toHaveTextContent('teaser');
  });
});
