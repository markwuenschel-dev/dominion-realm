import Link from 'next/link';
import type { CodexEntry } from '@/lib/codex';
import { entryKicker, codexUrl } from '@/lib/codex';
import { isUngated, TIER_LABELS } from '@/lib/reveal';
import { ContentImage } from '@/components/ContentImage';
import { MediaPlaceholder } from '@/components/MediaPlaceholder';
import { SubjectImage } from '@/components/SubjectImage';
import type { ResolvedImage } from '@/sanity/media';

/**
 * A single codex entry as a browse card. The summary is always shown — it's
 * spoiler-safe by schema design — while a tier chip signals when the full entry
 * carries gated, higher-reveal content. The card image follows the Sanity → git
 * → placeholder order: the index page resolves each entry's Sanity Primary (by
 * `kind:slug`) and passes it as `sanity`, falling back to the git `entry.data.image`.
 */
export function CodexCard({ entry, sanity }: { entry: CodexEntry; sanity?: ResolvedImage }) {
  const url = codexUrl(entry.collection, entry.id);
  const kicker = entryKicker(entry);
  const tier = entry.data.reveal;
  const image = entry.data.image;

  return (
    <Link className="codex-card" href={url}>
      <figure className="codex-card__media">
        {sanity ? (
          <SubjectImage
            source={sanity.source}
            alt={sanity.alt || entry.data.name}
            aspect={[16, 9]}
            sizes="(max-width: 620px) 100vw, 360px"
          />
        ) : image ? (
          <ContentImage src={image} alt={entry.data.imageAlt ?? entry.data.name} loading="lazy" />
        ) : (
          <MediaPlaceholder label={entry.data.name} />
        )}
      </figure>
      <span className="codex-card__kicker">{kicker}</span>
      <h3 className="codex-card__name">{entry.data.name}</h3>
      <p className="codex-card__summary">{entry.data.summary}</p>
      {!isUngated(tier) && (
        <span className="codex-card__tier" data-tier={tier}>
          {TIER_LABELS[tier]}
        </span>
      )}
    </Link>
  );
}
