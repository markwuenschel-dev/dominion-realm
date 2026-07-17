/**
 * The four-tier reveal model — the project's ubiquitous language for spoiler
 * control (ADR-0004). Tiers are ordered from safest to most revealing:
 *
 *   Teaser  → spoiler-safe, the marketing baseline shown to everyone
 *   Reader  → what you'd know after finishing Book One
 *   Deep    → major Book One spoilers / endgame
 *   Beyond  → series-level hints toward future books
 *
 * This module is the single source of truth for that vocabulary and the only
 * piece of real reveal *logic*; the schema, toggle UI, and gating all defer to
 * it. Keep it pure and dependency-free so it stays trivially testable.
 */

export const REVEAL_TIERS = ['teaser', 'reader', 'deep', 'beyond'] as const;

export type RevealTier = (typeof REVEAL_TIERS)[number];

/** Marketing-safe baseline shown to everyone, including no-JS readers. */
export const DEFAULT_TIER: RevealTier = 'teaser';

/** localStorage key holding the reader's chosen reveal level. */
export const REVEAL_STORAGE_KEY = 'dr-reveal-level';

/** Canonical display names — use this exact casing in UI and prose. */
export const TIER_LABELS: Record<RevealTier, string> = {
  teaser: 'Teaser',
  reader: 'Reader',
  deep: 'Deep',
  beyond: 'Beyond',
};

/** One-line description of what each tier exposes (for the toggle UI). */
export const TIER_DESCRIPTIONS: Record<RevealTier, string> = {
  teaser: 'Spoiler-safe. What anyone can see before reading.',
  reader: "What you'd know after finishing Book One.",
  deep: 'Major Book One spoilers and endgame.',
  beyond: 'Series-level hints toward books still to come.',
};

const TIER_RANK = Object.fromEntries(REVEAL_TIERS.map((tier, index) => [tier, index])) as Record<
  RevealTier,
  number
>;

/** Numeric rank of a tier (teaser = 0 … beyond = 3). */
export function rankOf(tier: RevealTier): number {
  return TIER_RANK[tier];
}

/** The higher (more revealing) of two tiers. Used to inherit a tier — e.g. a
 *  relationship pointing at a `deep` entry is itself a `deep` fact. */
export function maxTier(a: RevealTier, b: RevealTier): RevealTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/**
 * Is content at this tier ungated — i.e. the spoiler-safe baseline shown to
 * everyone, including no-JS readers, with no reveal gate? Only the default
 * (teaser) tier qualifies. Centralizes the "teaser == always visible" rule the
 * search index and <RevealGate> both rely on, instead of a bare `=== 'teaser'`.
 */
export function isUngated(tier: RevealTier): boolean {
  return tier === DEFAULT_TIER;
}

/**
 * Is content gated at `required` visible to a reader whose current reveal
 * level is `level`? Higher levels are cumulative: a Deep reader sees Teaser,
 * Reader, and Deep content.
 */
export function isRevealed(required: RevealTier, level: RevealTier): boolean {
  return TIER_RANK[level] >= TIER_RANK[required];
}

/** Type guard: is `value` one of the four canonical tiers? */
export function isRevealTier(value: unknown): value is RevealTier {
  return typeof value === 'string' && (REVEAL_TIERS as readonly string[]).includes(value);
}

/**
 * Coerce an untrusted value (e.g. from localStorage or a data attribute) to a
 * valid tier, falling back to the safe default. Never throws.
 */
export function parseTier(value: unknown): RevealTier {
  return isRevealTier(value) ? value : DEFAULT_TIER;
}

/**
 * Strip every in-body reveal gate from an MDX string, leaving only the ungated
 * (teaser) prose around them — both the block `<RevealGate>…</RevealGate>` and
 * the inline `<Reveal>…</Reveal>` span.
 *
 * A codex/journal entry can be teaser-tier overall yet wrap spoilers in gates
 * inside its body. The search corpus indexes teaser bodies (see
 * `getSearchDocuments`), so those gated sections must be removed first or the
 * spoilers leak into search — breaking the ADR-0004 guarantee that gated text
 * never enters the index. Any gate, whatever its tier, is treated as non-teaser
 * and dropped.
 *
 * Inline `<Reveal>` spans are stripped first (they may sit inside a `<RevealGate>`
 * block), then the blocks. `\b` after `Reveal` keeps the inline pattern from
 * matching `<RevealGate>` (no word boundary between "Reveal" and "Gate"), so the
 * two passes never cross-match. Gates of the same kind are authored flat (never
 * self-nested), so a non-greedy match is sufficient.
 */
export function stripGatedSections(mdx: string): string {
  return mdx
    .replace(/<Reveal\b[^>]*>[\s\S]*?<\/Reveal\s*>/g, '')
    .replace(/<RevealGate\b[^>]*>[\s\S]*?<\/RevealGate\s*>/g, '');
}

/**
 * Project a list of tier-carrying items through show/seal transforms. Useful
 * when a surface wants one pass that both filters visibility and drops
 * sensitive fields from sealed items (map markers, relationship lists).
 *
 * Not the only gated-surface seam: whole-item gates that seal in-place
 * (codex cards, constellation nodes, journal rows) call `isRevealed` directly
 * and own their own placeholder markup. The decision rule is still shared —
 * everyone defers to `isRevealed` / `isUngated` — this helper is just the
 * list-projection shape. Pure; client callers own the `useReveal` read.
 */
export function projectByReveal<T extends { reveal: RevealTier }, R, S>(
  items: readonly T[],
  level: RevealTier,
  show: (item: T) => R,
  seal: (item: T) => S,
): Array<R | S> {
  return items.map((item) => (isRevealed(item.reveal, level) ? show(item) : seal(item)));
}
