import { describe, it, expect } from 'vitest';
import {
  resolveBuyCta,
  buyCtaFromEnv,
  DEFAULT_BUY_LABEL,
  DEFAULT_SOON_LABEL,
  NEWSLETTER_HREF,
} from './cta';

/**
 * Buy / pre-order CTA state selection. The component just renders these states,
 * so the branching (buy vs. graceful newsletter fallback) is tested here.
 */
describe('resolveBuyCta', () => {
  it('falls back to the newsletter prompt when no buy URL is set', () => {
    const state = resolveBuyCta({});
    expect(state.mode).toBe('soon');
    expect(state.href).toBe(NEWSLETTER_HREF);
    expect(state.label).toBe(DEFAULT_SOON_LABEL);
    expect(state.external).toBe(false);
  });

  it('treats blank / whitespace-only buy URLs as unset', () => {
    expect(resolveBuyCta({ buyUrl: '' }).mode).toBe('soon');
    expect(resolveBuyCta({ buyUrl: '   ' }).mode).toBe('soon');
    expect(resolveBuyCta({ buyUrl: null }).mode).toBe('soon');
  });

  it('renders a buy state with the default label when a URL is set', () => {
    const state = resolveBuyCta({ buyUrl: 'https://example.com/book' });
    expect(state.mode).toBe('buy');
    expect(state.href).toBe('https://example.com/book');
    expect(state.label).toBe(DEFAULT_BUY_LABEL);
    expect(state.external).toBe(true);
  });

  it('honors a custom label and trims surrounding whitespace', () => {
    const state = resolveBuyCta({
      buyUrl: '  https://store.test/preorder  ',
      buyLabel: '  Pre-order now  ',
    });
    expect(state.mode).toBe('buy');
    expect(state.href).toBe('https://store.test/preorder');
    expect(state.label).toBe('Pre-order now');
  });

  it('ignores a blank custom label and uses the default', () => {
    const state = resolveBuyCta({ buyUrl: 'https://x.test', buyLabel: '   ' });
    expect(state.label).toBe(DEFAULT_BUY_LABEL);
  });

  it('allows overriding the fallback newsletter target', () => {
    const state = resolveBuyCta({ newsletterHref: '#join' });
    expect(state.mode).toBe('soon');
    expect(state.href).toBe('#join');
  });
});

describe('buyCtaFromEnv', () => {
  it('reads NEXT_PUBLIC_BUY_URL / NEXT_PUBLIC_BUY_LABEL from the environment', () => {
    const prevUrl = process.env.NEXT_PUBLIC_BUY_URL;
    const prevLabel = process.env.NEXT_PUBLIC_BUY_LABEL;
    try {
      process.env.NEXT_PUBLIC_BUY_URL = 'https://buy.test/realm';
      process.env.NEXT_PUBLIC_BUY_LABEL = 'Order the hardcover';
      const state = buyCtaFromEnv();
      expect(state.mode).toBe('buy');
      expect(state.href).toBe('https://buy.test/realm');
      expect(state.label).toBe('Order the hardcover');
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_BUY_URL;
      else process.env.NEXT_PUBLIC_BUY_URL = prevUrl;
      if (prevLabel === undefined) delete process.env.NEXT_PUBLIC_BUY_LABEL;
      else process.env.NEXT_PUBLIC_BUY_LABEL = prevLabel;
    }
  });
});
