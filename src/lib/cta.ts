/**
 * Pure state selection for the buy / pre-order CTA (Tier 3).
 *
 * There is no real storefront yet, so the CTA is configuration-driven:
 *   - `NEXT_PUBLIC_BUY_URL`   — when set, render a prominent buy/pre-order link.
 *   - `NEXT_PUBLIC_BUY_LABEL` — optional button label override.
 * When the buy URL is absent we degrade gracefully to a "coming soon — join the
 * list" prompt that points at the existing newsletter signup, so the surface is
 * never a dead or fake checkout. The component reads these env vars; this module
 * holds the decision logic so it can be unit-tested without a DOM.
 */

export const DEFAULT_BUY_LABEL = 'Buy / Pre-order the Book';
export const DEFAULT_SOON_LABEL = 'Join the list for release news';
/** Where the fallback "join the list" CTA points (homepage newsletter anchor). */
export const NEWSLETTER_HREF = '/#join';

export interface BuyCtaInput {
  buyUrl?: string | null;
  buyLabel?: string | null;
  /** Override the newsletter target (defaults to the homepage #join anchor). */
  newsletterHref?: string;
}

export type BuyCtaState =
  | {
      mode: 'buy';
      href: string;
      label: string;
      /** Buy links leave the site, so callers add target/rel. */
      external: true;
    }
  | {
      mode: 'soon';
      href: string;
      label: string;
      external: false;
    };

/** Trim a possibly-undefined env value to a non-empty string, or undefined. */
function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Resolve which CTA to show. A non-empty `buyUrl` yields the buy state (with an
 * optional custom label); anything else falls back to the newsletter prompt.
 */
export function resolveBuyCta(input: BuyCtaInput = {}): BuyCtaState {
  const buyUrl = clean(input.buyUrl);
  if (buyUrl) {
    return {
      mode: 'buy',
      href: buyUrl,
      label: clean(input.buyLabel) ?? DEFAULT_BUY_LABEL,
      external: true,
    };
  }
  return {
    mode: 'soon',
    href: input.newsletterHref ?? NEWSLETTER_HREF,
    label: DEFAULT_SOON_LABEL,
    external: false,
  };
}

/** Read the CTA state from the public env vars (build-time inlined). */
export function buyCtaFromEnv(newsletterHref?: string): BuyCtaState {
  return resolveBuyCta({
    buyUrl: process.env.NEXT_PUBLIC_BUY_URL,
    buyLabel: process.env.NEXT_PUBLIC_BUY_LABEL,
    newsletterHref,
  });
}
