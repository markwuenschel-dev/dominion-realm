import Link from 'next/link';
import type { CodexEntry } from '@/lib/codex';
import { entryKicker, codexUrl } from '@/lib/codex';
import { TIER_LABELS } from '@/lib/reveal';
import { ContentImage } from '@/components/ContentImage';

/**
 * A single codex entry as a browse card. The summary is always shown — it's
 * spoiler-safe by schema design — while a tier chip signals when the full entry
 * carries gated, higher-reveal content.
 */
export function CodexCard({ entry }: { entry: CodexEntry }) {
  const url = codexUrl(entry.collection, entry.id);
  const kicker = entryKicker(entry);
  const tier = entry.data.reveal;
  const image = entry.data.image;

  return (
    <Link className="codex-card" href={url}>
      {image && (
        <figure className="codex-card__media">
          <ContentImage src={image} alt={entry.data.imageAlt ?? entry.data.name} loading="lazy" />
        </figure>
      )}
      <span className="codex-card__kicker">{kicker}</span>
      <h3 className="codex-card__name">{entry.data.name}</h3>
      <p className="codex-card__summary">{entry.data.summary}</p>
      {tier !== 'teaser' && (
        <span className="codex-card__tier" data-tier={tier}>
          {TIER_LABELS[tier]}
        </span>
      )}
    </Link>
  );
}
