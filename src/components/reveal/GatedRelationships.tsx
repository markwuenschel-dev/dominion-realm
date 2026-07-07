'use client';

import Link from 'next/link';
import { projectByReveal, TIER_LABELS } from '@/lib/reveal';
import { useReveal } from './RevealContext';
import type { ResolvedLink } from '@/lib/codex';

/**
 * The codex entry's "Connected threads" list, gated per link. Each relationship
 * carries an effective tier (the higher of its own and the target entry's — see
 * `resolveRelationships`); a link above the reader's level renders as a sealed
 * pill that drops the target's name and URL (projection, like the map markers),
 * so a spoilery connection never reaches the DOM at a lower tier.
 */
export function GatedRelationships({ links }: { links: ResolvedLink[] }) {
  const { level } = useReveal();

  const projected = projectByReveal(
    links,
    level,
    (l) => ({ sealed: false as const, key: l.url, link: l }),
    (l) => ({ sealed: true as const, key: l.url, reveal: l.reveal }),
  );

  return (
    <div className="codex-rel__list">
      {projected.map((item) =>
        item.sealed ? (
          <span
            key={item.key}
            className="codex-rel__item codex-rel__item--sealed"
            aria-label={`Sealed · ${TIER_LABELS[item.reveal]} — raise your reveal level to see this connection.`}
          >
            <span className="codex-rel__rel">Sealed · {TIER_LABELS[item.reveal]}</span>
            <span>Raise your reveal level</span>
          </span>
        ) : (
          <Link key={item.key} className="codex-rel__item" href={item.link.url}>
            {item.link.label && <span className="codex-rel__rel">{item.link.label}</span>}
            <span>{item.link.name}</span>
          </Link>
        ),
      )}
    </div>
  );
}
