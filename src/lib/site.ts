/**
 * Single source of truth for cross-page site chrome (Phase 0 of the
 * content-depth backlog). The footer, the About page, the homepage timeline,
 * and the shared navigation all read from here so a new page or a real social
 * URL is a one-line change instead of an edit hunt across templates.
 *
 * Everything here is plain data: page links are stored as base-relative slugs
 * and the consuming template prepends the base path. In production the site is
 * served from the root (`/`), so the base is simply `/`; keeping links
 * base-relative leaves room for a future subpath deploy without an edit hunt.
 */

/**
 * Canonical public origin — the single source of truth for absolute URLs
 * (OG/canonical metadata, the RSS feed, the Keystatic OAuth redirect). Set
 * `NEXT_PUBLIC_SITE_URL` in the deploy env (`env/dominion-realm.env`); it falls
 * back to the registered domain so a build without the var still emits sane URLs.
 *
 * Uses `|| ` (not `??`) and trims, so an env var present-but-empty — e.g. a bare
 * `NEXT_PUBLIC_SITE_URL=` line — also falls back rather than yielding `''` and
 * blowing up `new URL('')` (ERR_INVALID_URL) in `metadataBase`. Trailing slash
 * is stripped so callers can append `/path` unconditionally.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thedominionrealm.com'
).replace(/\/$/, '');

export interface Social {
  label: string;
  /** Public profile URL. Omit (or leave undefined) to hide the link until a
   *  real URL exists — we never ship `href="#"` dead links. */
  url?: string;
}

export interface PubMilestone {
  /** Short timeframe label, e.g. "2026" or "Q1 2026". */
  when: string;
  /** The milestone itself, e.g. "Prologue & Chapter One go live". */
  what: string;
  /** Mark done milestones so the timeline can style them as reached. */
  done?: boolean;
}

export interface Axiom {
  /** Roman numeral, e.g. "I". */
  numeral: string;
  /** The axiom line (may contain a short break via " / "). */
  text: string;
  /** Optional gloss shown under the line. */
  gloss?: string;
}

export interface CoverArt {
  /** Public path to the cover image (a file under `public/`), e.g.
   *  `/covers/cover.png`. Edited in the browser via Keystatic's Homepage
   *  singleton and read by `getHomeSettings()` (`src/lib/homeSettings.ts`). */
  src: string;
  /** Alt text for the cover — the book's title treatment. */
  alt: string;
}

export interface SiteConfig {
  /** Author display name. Placeholder until Mark supplies it — surfaces in the
   *  footer, the About page, and meta. */
  author: string;
  /** Social links. URL-less entries are intentionally hidden (see `Social`). */
  socials: Social[];
  /** Publication timeline rows. Empty until Mark supplies dates — the homepage
   *  section renders only when this has entries. */
  pubMilestones: PubMilestone[];
  /** The Axioms of the Realm. Seeded with the First Axiom; the homepage section
   *  renders whenever this has entries. Mark adds #2–5. */
  axioms: Axiom[];
  /** "For readers of …" comp titles. Empty until Mark chooses them — the
   *  homepage callout renders only when this has entries. */
  comps: string[];
}

export const SITE: SiteConfig = {
  author: 'Mark Wuenschel',
  socials: [
    { label: 'Instagram' },
    { label: 'Goodreads' },
    { label: 'TikTok' },
    { label: 'Discord' },
  ],
  pubMilestones: [],
  axioms: [
    {
      numeral: 'I',
      text: 'One substrate. / Many interfaces.',
      gloss: 'The Realm is one reality; every walker reads it through a translation of their own.',
    },
    // Mark: add Axioms II–V here (numeral + text + optional gloss).
  ],
  comps: [],
};

/** Socials that actually have a URL — the only ones we render. */
export const liveSocials = (): Social[] => SITE.socials.filter((s) => Boolean(s.url));

/** A homepage section anchor (scrollspy target on the home route `/`). */
export interface NavSection {
  /** Two-digit index shown in the rail, e.g. "02". */
  idx: string;
  label: string;
  /** In-page hash target, e.g. "#characters". */
  hash: string;
}

/** A standalone site page. `slug` is base-relative (no leading slash). */
export interface NavPage {
  idx: string;
  label: string;
  slug: string;
  /** When false, the route exists but is kept out of the live nav until its
   *  content/art lands (avoids surfacing a placeholder page). Flip to true (or
   *  drop the field) to light it up. */
  ready?: boolean;
}

/**
 * Homepage section rail. Both the sidebar and the mobile menu render this, and
 * the scrollspy lights the matching link — so a new section registers once.
 */
export const NAV_SECTIONS: NavSection[] = [
  { idx: '00', label: 'Cover', hash: '#hero' },
  { idx: '01', label: 'The Story', hash: '#story' },
  { idx: '02', label: 'Characters', hash: '#characters' },
  { idx: '03', label: 'The World', hash: '#world' },
  { idx: '04', label: 'The Eyes', hash: '#power' },
  { idx: '05', label: 'Join', hash: '#join' },
];

/**
 * Standalone pages surfaced in the homepage nav. New routes (map,
 * relationships, …) register here once and appear in sidebar + mobile menu.
 */
export const NAV_PAGES: NavPage[] = [
  { idx: '→', label: 'Codex', slug: 'codex' },
  { idx: '→', label: 'Read', slug: 'read' },
  { idx: '→', label: 'Journal', slug: 'journal' },
  { idx: '→', label: 'The Map', slug: 'map' },
  { idx: '→', label: 'Constellation', slug: 'relationships' },
  // Seeded with example beats for now; replace src/content/timeline/ with the
  // manuscript's real beats when ready. Linked in nav so the feature is live.
  { idx: '→', label: 'The Timeline', slug: 'timeline' },
  { idx: '→', label: 'About', slug: 'about' },
  { idx: '→', label: 'Calculator', slug: 'calculator' },
  // Built but not yet linked — flip `ready: true` once Marcus's sheet carries
  // the manuscript's real numbers (src/data/marcus-sheet.ts, drop `provisional`).
  { idx: '→', label: 'The Sheet', slug: 'interface', ready: false },
];

/** Nav pages that should appear in the live nav (hides `ready: false`). */
export const liveNavPages = (): NavPage[] => NAV_PAGES.filter((p) => p.ready !== false);

/** Whether a given route is flagged ready (used to gate homepage teasers). */
export const navPageReady = (slug: string): boolean =>
  NAV_PAGES.some((p) => p.slug === slug && p.ready !== false);

/** Prepend the base path to a nav slug. */
export const navHref = (base: string, slug: string): string => `${base}${slug}`;
