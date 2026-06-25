'use client';

import { isRevealed, isUngated, TIER_LABELS, type RevealTier } from '@/lib/reveal';
import { useReveal } from './RevealContext';

/**
 * Gates a section behind a reveal tier (ADR-0004).
 *
 * Teaser content renders normally — the spoiler-safe baseline, present in SSR
 * HTML and readable with no JS. Above-teaser content is rendered only once the
 * reader's level reaches the gate's tier; until then it is absent from the live
 * DOM (a sealed placeholder shows instead), matching the Astro `<template>`
 * behavior. Sealed children still travel in the RSC payload — the same honest
 * limit as before; this guards against accidental spoilers, not view-source.
 */
export function RevealGate({
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
      <div className="reveal-gate" data-reveal-tier={tier}>
        {children}
      </div>
    );
  }

  const open = isRevealed(tier, level);
  const sealedMessage = label ?? `Raise your reveal level to ${TIER_LABELS[tier]} to read this.`;

  return (
    <div className={`reveal-gate ${open ? 'is-open' : 'is-sealed'}`} data-reveal-tier={tier}>
      {open ? (
        children
      ) : (
        <p className="reveal-gate__sealed">
          <span className="reveal-gate__lock">Sealed · {TIER_LABELS[tier]}</span>
          <span className="reveal-gate__msg">{sealedMessage}</span>
        </p>
      )}
    </div>
  );
}
