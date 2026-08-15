import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealProvider } from './RevealContext';
import { GatedRelationships } from './GatedRelationships';
import { REVEAL_STORAGE_KEY } from '@/lib/reveal';
import type { ResolvedLink } from '@/lib/codex';

/**
 * GatedRelationships projects each connection by reveal: a sealed item must
 * drop the target's name and URL so it is not a link; a revealed item is a
 * link that carries the name.
 */

const sealedLink: ResolvedLink = {
  url: '/codex/characters/marcus',
  name: 'Marcus',
  label: 'betrayed by',
  reveal: 'deep',
};

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.reveal;
});

describe('GatedRelationships', () => {
  it('renders a sealed item as a non-link with no href', () => {
    const { container } = render(
      <RevealProvider>
        <GatedRelationships links={[sealedLink]} />
      </RevealProvider>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('[href]')).toBeNull();
    expect(screen.queryByText('Marcus')).not.toBeInTheDocument();
    expect(screen.getByText('Sealed · Deep')).toBeInTheDocument();
  });

  it('renders a revealed item as a link with the name', async () => {
    localStorage.setItem(REVEAL_STORAGE_KEY, 'deep');
    render(
      <RevealProvider>
        <GatedRelationships links={[sealedLink]} />
      </RevealProvider>,
    );
    const link = await screen.findByRole('link', { name: /Marcus/ });
    expect(link).toHaveAttribute('href', '/codex/characters/marcus');
    expect(screen.getByText('Marcus')).toBeInTheDocument();
    expect(screen.queryByText('Sealed · Deep')).not.toBeInTheDocument();
  });
});
