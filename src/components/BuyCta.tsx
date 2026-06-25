import { buyCtaFromEnv } from '@/lib/cta';

/**
 * Buy / pre-order call to action (Tier 3). Reads NEXT_PUBLIC_BUY_URL /
 * NEXT_PUBLIC_BUY_LABEL at build time via `buyCtaFromEnv` (pure logic in
 * src/lib/cta.ts). With a buy URL set it renders a prominent outbound button;
 * without one it degrades to a "coming soon — join the list" prompt pointing at
 * the existing newsletter. Reuses the global `.btn` tokens so it sits natively
 * on the homepage and the reading page.
 */
export function BuyCta({
  newsletterHref,
  note,
  className = '',
}: {
  /** Override where the fallback prompt points (defaults to /#join). */
  newsletterHref?: string;
  /** Small caption under the button. */
  note?: string;
  className?: string;
}) {
  const state = buyCtaFromEnv(newsletterHref);

  return (
    <div className={`buy-cta${className ? ` ${className}` : ''}`}>
      {state.mode === 'buy' ? (
        <a className="btn btn-primary" href={state.href} target="_blank" rel="noopener noreferrer">
          {state.label} <span className="arrow">→</span>
        </a>
      ) : (
        <>
          <span className="buy-cta__eyebrow">Coming soon</span>
          <a className="btn btn-ghost" href={state.href}>
            {state.label} <span className="arrow">→</span>
          </a>
        </>
      )}
      {note && <span className="buy-note">{note}</span>}
    </div>
  );
}
