'use client';

import { REVEAL_TIERS, TIER_LABELS, TIER_DESCRIPTIONS } from '@/lib/reveal';
import { useReveal } from './RevealContext';

/**
 * The global reveal-level control (ADR-0004): a four-way segmented switch that
 * drives every <RevealGate> via context and persists the reader's choice. May
 * be mounted more than once (sidebar + mobile); all instances stay in sync
 * because they read the same context.
 */
export function RevealToggle() {
  const { level, setLevel } = useReveal();

  return (
    <fieldset className="reveal-toggle" aria-label="Spoiler reveal level">
      <legend className="reveal-toggle__legend">Reveal</legend>
      <div className="reveal-toggle__options" role="radiogroup">
        {REVEAL_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            className="reveal-toggle__btn"
            role="radio"
            aria-checked={tier === level ? 'true' : 'false'}
            title={TIER_DESCRIPTIONS[tier]}
            onClick={() => setLevel(tier)}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
