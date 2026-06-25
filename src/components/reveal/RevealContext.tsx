'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_TIER, REVEAL_STORAGE_KEY, parseTier, type RevealTier } from '@/lib/reveal';

/**
 * Reveal-level state (ADR-0004), ported from the Astro RevealToggle controller.
 * Defaults to Teaser on the server and on first client paint — so SSR HTML is
 * spoiler-safe and there's no hydration mismatch — then restores the reader's
 * persisted choice from localStorage after mount. Mirrors the level onto
 * `document.documentElement.dataset.reveal` for CSS hooks.
 */

interface RevealState {
  level: RevealTier;
  setLevel: (tier: RevealTier) => void;
}

const RevealCtx = createContext<RevealState>({ level: DEFAULT_TIER, setLevel: () => {} });

export function RevealProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<RevealTier>(DEFAULT_TIER);

  useEffect(() => {
    try {
      setLevelState(parseTier(localStorage.getItem(REVEAL_STORAGE_KEY)));
    } catch {
      /* storage blocked — stay at the safe default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reveal = level;
  }, [level]);

  const setLevel = useCallback((tier: RevealTier) => {
    setLevelState(tier);
    try {
      localStorage.setItem(REVEAL_STORAGE_KEY, tier);
    } catch {
      /* storage blocked — still applies for this session */
    }
  }, []);

  return <RevealCtx.Provider value={{ level, setLevel }}>{children}</RevealCtx.Provider>;
}

export const useReveal = (): RevealState => useContext(RevealCtx);
