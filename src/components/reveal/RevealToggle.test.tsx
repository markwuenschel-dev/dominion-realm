import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealProvider } from './RevealContext';
import { RevealToggle } from './RevealToggle';

/**
 * The global reveal control: a four-way radiogroup whose checked state tracks
 * the shared context level and whose clicks drive it.
 */

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.reveal;
});

describe('RevealToggle', () => {
  it('renders a radio for each of the four tiers', () => {
    render(
      <RevealProvider>
        <RevealToggle />
      </RevealProvider>,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    for (const name of ['Teaser', 'Reader', 'Deep', 'Beyond']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
  });

  it('marks the current level as checked (teaser by default)', () => {
    render(
      <RevealProvider>
        <RevealToggle />
      </RevealProvider>,
    );
    expect(screen.getByRole('radio', { name: 'Teaser' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Beyond' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves the checked state when a tier is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RevealProvider>
        <RevealToggle />
      </RevealProvider>,
    );
    await user.click(screen.getByRole('radio', { name: 'Beyond' }));
    expect(screen.getByRole('radio', { name: 'Beyond' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Teaser' })).toHaveAttribute('aria-checked', 'false');
  });
});
