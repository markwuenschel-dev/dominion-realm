import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageCredit } from './ImageCredit';

/**
 * The "Art by —" credit line (ADR-0011, Phase 4). Asserts the observable public
 * contract: a plain name, an optional safe outbound link, and total silence when
 * there's no credit. Private licence notes are dropped upstream and never reach
 * this component, so there's nothing to leak here.
 */
describe('ImageCredit', () => {
  it('renders a plain-text credit when there is no url', () => {
    const { container } = render(<ImageCredit credit={{ name: 'Jane Doe' }} />);
    expect(container.textContent).toBe('Art by Jane Doe');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders the name as a safe outbound link when a creditUrl is set', () => {
    render(<ImageCredit credit={{ name: 'Jane Doe', url: 'https://jane.example' }} />);
    const link = screen.getByRole('link', { name: 'Jane Doe' });
    expect(link).toHaveAttribute('href', 'https://jane.example');
    expect(link).toHaveAttribute('target', '_blank');
    // Safe outbound: no referrer/opener leakage, and not an SEO endorsement.
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.getAttribute('rel')).toContain('nofollow');
  });

  it('renders nothing when there is no credit', () => {
    const { container } = render(<ImageCredit credit={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('appends an extra class alongside the base class', () => {
    const { container } = render(
      <ImageCredit credit={{ name: 'Jane Doe' }} className="lightbox__credit" />,
    );
    const p = container.querySelector('p');
    expect(p).toHaveClass('image-credit');
    expect(p).toHaveClass('lightbox__credit');
  });
});
