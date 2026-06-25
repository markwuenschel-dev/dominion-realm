import type { CodexEntry } from '@/lib/codex';
import { entryKicker, codexUrl } from '@/lib/codex';
import { TIER_LABELS } from '@/lib/reveal';

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
    <a className="codex-card" href={url}>
      {image && (
        <figure className="codex-card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={entry.data.imageAlt ?? entry.data.name} />
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
    </a>
  );
}
