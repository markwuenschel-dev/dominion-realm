import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealProvider } from './RevealContext';
import { RevealInline } from './RevealInline';
import { REVEAL_STORAGE_KEY } from '@/lib/reveal';

/**
 * RevealInline is the in-sentence sibling of RevealGate: sealed children must
 * be absent from the live DOM until the reader's level reaches the gate.
 */

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.reveal;
});

describe('RevealInline', () => {
  it('seals above-teaser text at the default level', () => {
    render(
      <RevealProvider>
        <p>
          Serra <RevealInline tier="deep">severs the bond herself</RevealInline> at the finale.
        </p>
      </RevealProvider>,
    );
    expect(screen.queryByText('severs the bond herself')).not.toBeInTheDocument();
    expect(screen.getByText('Sealed · Deep')).toBeInTheDocument();
  });

  it('reveals sealed text once a persisted level reaches the gate', async () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'deep');
    render(
      <RevealProvider>
        <p>
          Serra <RevealInline tier="deep">severs the bond herself</RevealInline> at the finale.
        </p>
      </RevealProvider>,
    );
    expect(await screen.findByText('severs the bond herself')).toBeInTheDocument();
    expect(screen.queryByText('Sealed · Deep')).not.toBeInTheDocument();
  });
});
