import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealProvider } from './RevealContext';
import { GatedCard } from './GatedCard';
import { REVEAL_STORAGE_KEY } from '@/lib/reveal';

/**
 * GatedCard withholds a whole browse-card identity (name + summary) until the
 * reader's level reaches the entry's tier. Sealed children must be absent from
 * the live DOM; the sealed label stands in their place.
 */

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.reveal;
});

describe('GatedCard', () => {
  it('withholds children name and summary when sealed', () => {
    render(
      <RevealProvider>
        <GatedCard tier="deep">
          <h3>Illyristranthe</h3>
          <p>The last Xyloryn who still remembers the pact.</p>
        </GatedCard>
      </RevealProvider>,
    );
    expect(screen.queryByText('Illyristranthe')).not.toBeInTheDocument();
    expect(screen.queryByText('The last Xyloryn who still remembers the pact.')).not.toBeInTheDocument();
    expect(screen.getByText('Sealed · Deep')).toBeInTheDocument();
  });

  it('reveals children once a persisted level reaches the card', async () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'deep');
    render(
      <RevealProvider>
        <GatedCard tier="deep">
          <h3>Illyristranthe</h3>
          <p>The last Xyloryn who still remembers the pact.</p>
        </GatedCard>
      </RevealProvider>,
    );
    expect(await screen.findByText('Illyristranthe')).toBeInTheDocument();
    expect(screen.getByText('The last Xyloryn who still remembers the pact.')).toBeInTheDocument();
    expect(screen.queryByText('Sealed · Deep')).not.toBeInTheDocument();
  });
});
