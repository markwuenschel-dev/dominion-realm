import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealProvider } from './RevealContext';
import { RevealGate } from './RevealGate';
import { RevealToggle } from './RevealToggle';
import { REVEAL_STORAGE_KEY } from '@/lib/reveal';

/**
 * RevealGate is the spoiler guarantee as the reader experiences it: above-teaser
 * children must be absent from the live DOM until the reader's level reaches the
 * gate. These tests assert exactly that (queryByText → not present when sealed).
 */

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.reveal;
});

describe('RevealGate', () => {
  it('always renders teaser content (the no-JS baseline)', () => {
    render(
      <RevealProvider>
        <RevealGate tier="teaser">
          <p>open baseline</p>
        </RevealGate>
      </RevealProvider>,
    );
    expect(screen.getByText('open baseline')).toBeInTheDocument();
  });

  it('seals above-teaser content at the default level', () => {
    render(
      <RevealProvider>
        <RevealGate tier="deep">
          <p>major spoiler</p>
        </RevealGate>
      </RevealProvider>,
    );
    expect(screen.queryByText('major spoiler')).not.toBeInTheDocument();
    expect(screen.getByText('Sealed · Deep')).toBeInTheDocument();
  });

  it('uses a custom label as the sealed message', () => {
    render(
      <RevealProvider>
        <RevealGate tier="reader" label="Finish Book One first.">
          <p>hidden</p>
        </RevealGate>
      </RevealProvider>,
    );
    expect(screen.getByText('Finish Book One first.')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('reveals sealed content once a persisted level reaches the gate', async () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'deep');
    render(
      <RevealProvider>
        <RevealGate tier="deep">
          <p>major spoiler</p>
        </RevealGate>
      </RevealProvider>,
    );
    expect(await screen.findByText('major spoiler')).toBeInTheDocument();
    expect(screen.queryByText('Sealed · Deep')).not.toBeInTheDocument();
  });

  it('opens a sealed gate when the reader raises the level via the toggle', async () => {
    const user = userEvent.setup();
    render(
      <RevealProvider>
        <RevealToggle />
        <RevealGate tier="deep">
          <p>major spoiler</p>
        </RevealGate>
      </RevealProvider>,
    );
    expect(screen.queryByText('major spoiler')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Deep' }));
    expect(screen.getByText('major spoiler')).toBeInTheDocument();
  });
});
