'use client';

import { isRevealed, TIER_LABELS, type RevealTier } from '@/lib/reveal';
import { useReveal } from './RevealContext';

/**
 * Seals a whole codex browse card above the reader's level. Revealed → renders
 * the server-built card (children); sealed → a card-shaped placeholder that
 * withholds the entry's name, summary, and image, so an above-teaser entry never
 * advertises its identity on the codex index. Mirrors the whole-item gating the
 * map markers and timeline already use. Teaser entries (the default) are always
 * revealed, so the index is unchanged for them.
 */
export function GatedCard({ tier, children }: { tier: RevealTier; children: React.ReactNode }) {
  const { level } = useReveal();

  if (isRevealed(tier, level)) return <>{children}</>;

  return (
    <div
      className="codex-card codex-card--sealed"
      data-reveal-tier={tier}
      aria-label={`Sealed · ${TIER_LABELS[tier]}`}
    >
      <span className="codex-card__tier">Sealed · {TIER_LABELS[tier]}</span>
      <p className="codex-card__sealed-msg">
        Raise your reveal level to {TIER_LABELS[tier]} to see this entry.
      </p>
    </div>
  );
}
