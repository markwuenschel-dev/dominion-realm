'use client';

import { isRevealed, isUngated, sealedLabel, sealedPrompt, type RevealTier } from '@/lib/reveal';
import { useReveal } from './RevealContext';

/**
 * Inline reveal gate — the in-sentence sibling of `<RevealGate>` (ADR-0004).
 *
 * Seals a word or phrase mid-paragraph: teaser content renders as ordinary text
 * (present in SSR HTML, readable with no JS); above-teaser content is replaced by
 * a compact sealed chip until the reader's level reaches the gate's tier. Like
 * every gate here, sealed children still travel in the RSC payload — the same
 * honest limit as `<RevealGate>`. Registered in `MdxBody` as `<Reveal>` for use
 * inside codex/journal MDX bodies, e.g.
 *
 *   Serra <Reveal tier="deep">severs the bond herself</Reveal> at the finale.
 */
export function RevealInline({
  tier,
  label,
  children,
}: {
  tier: RevealTier;
  label?: string;
  children: React.ReactNode;
}) {
  const { level } = useReveal();

  if (isUngated(tier)) {
    return (
      <span className="reveal-inline" data-reveal-tier={tier}>
        {children}
      </span>
    );
  }

  if (isRevealed(tier, level)) {
    return (
      <span className="reveal-inline is-open" data-reveal-tier={tier}>
        {children}
      </span>
    );
  }

  const message = label ?? sealedPrompt(tier);
  return (
    <span
      className="reveal-inline is-sealed"
      data-reveal-tier={tier}
      role="img"
      aria-label={`${sealedLabel(tier)} — ${message}`}
      title={message}
    >
      <span aria-hidden="true">{sealedLabel(tier)}</span>
    </span>
  );
}
