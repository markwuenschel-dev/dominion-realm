import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';
import type { SearchDoc } from '@/lib/search';

/**
 * Client-side codex search (MiniSearch over the build-time corpus). Tests use a
 * small controlled `docs` fixture rather than the real corpus, so they pin the
 * component's query→results behavior independent of content changes.
 */

const docs: SearchDoc[] = [
  {
    id: 'characters/marcus',
    url: '/codex/characters/marcus',
    title: 'Marcus Vye',
    kind: 'characters',
    summary: 'The Earth gamer at the centre of the Realm.',
  },
  {
    id: 'factions/astria',
    url: '/codex/factions/astria',
    title: 'Astria',
    kind: 'factions',
    summary: 'The institution behind the experiment.',
  },
  {
    id: 'reading/00-prologue',
    url: '/read/00-prologue',
    title: 'Prologue',
    kind: 'reading',
    summary: 'The opening pages.',
    body: 'full prose text',
  },
];

describe('SearchBox', () => {
  it('shows no results list before a query is typed', () => {
    render(<SearchBox docs={docs} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders a matching result with its title, kind, and link', async () => {
    const user = userEvent.setup();
    render(<SearchBox docs={docs} />);
    await user.type(screen.getByRole('searchbox'), 'Marcus');
    const link = screen.getByRole('link', { name: /Marcus Vye/ });
    expect(link).toHaveAttribute('href', '/codex/characters/marcus');
    expect(screen.getByText('characters')).toBeInTheDocument();
  });

  it('shows an empty-state message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<SearchBox docs={docs} />);
    await user.type(screen.getByRole('searchbox'), 'zzzznomatch');
    expect(screen.getByText('No matches.')).toBeInTheDocument();
  });

  it('caps the result list at 12 items', async () => {
    const many: SearchDoc[] = Array.from({ length: 15 }, (_, i) => ({
      id: `characters/n${i}`,
      url: `/codex/characters/n${i}`,
      title: `Alpha ${i}`,
      kind: 'characters',
      summary: 'shared keyword token',
    }));
    const user = userEvent.setup();
    render(<SearchBox docs={many} />);
    await user.type(screen.getByRole('searchbox'), 'Alpha');
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });
});
