import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCodexEntries,
  getCodexEntry,
  entryKicker,
  resolveRelationships,
  dossierFields,
  COLLECTION_LABELS,
  type CodexCollection,
  type DossierField,
} from '@/lib/codex';
import { MdxBody } from '@/components/MdxBody';
import { ContentImage } from '@/components/ContentImage';
import { SubjectImage } from '@/components/SubjectImage';
import { SubjectGallery } from '@/components/SubjectGallery';
import { RevealGate } from '@/components/reveal/RevealGate';
import { GatedRelationships } from '@/components/reveal/GatedRelationships';
import { isUngated, TIER_LABELS } from '@/lib/reveal';
import { getSubjectMedia, subjectKindFor } from '@/sanity/media';
import { entrySocialImage, previewMetadata } from '@/sanity/og';

type Params = { collection: string; id: string };

/** Render a single dossier fact as plain text, a pill, a link-pill, or a badge. */
function DossierValue({ field }: { field: DossierField }) {
  if (field.badge) {
    return <span className={`codex-badge codex-badge--${field.badge}`}>{field.value}</span>;
  }
  if (field.href) {
    return (
      <Link className="codex-chip" href={field.href}>
        {field.value}
      </Link>
    );
  }
  if (field.chip) return <span className="codex-chip">{field.value}</span>;
  return <>{field.value}</>;
}

export function generateStaticParams() {
  return getCodexEntries().map((e) => ({ collection: e.collection, id: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { collection, id } = await params;
  const entry = getCodexEntry(collection as CodexCollection, id);
  if (!entry) return {};
  // A sealed (above-teaser) entry must not leak its name/summary — inherit the
  // generic site metadata + default social art (the no-JS reveal baseline).
  if (!isUngated(entry.data.reveal)) return {};
  const media = await getSubjectMedia(subjectKindFor(entry.collection), id);
  const image = await entrySocialImage(entry.data.reveal, media?.primary);
  return previewMetadata(entry.data.name, entry.data.summary, image);
}

export default async function CodexEntryPage({ params }: { params: Promise<Params> }) {
  const { collection, id } = await params;
  const entry = getCodexEntry(collection as CodexCollection, id);
  if (!entry) notFound();

  const kicker = entryKicker(entry);
  const links = resolveRelationships(entry, getCodexEntries());
  const dossier = dossierFields(entry);
  const image = entry.data.image;
  // Sanity media (ADR-0011): primary + gallery + type slots for this Subject,
  // joined by kind:slug. null when no Subject exists → git image fallback below.
  const media = await getSubjectMedia(subjectKindFor(entry.collection), id);
  const hasSanityMedia = Boolean(media && (media.primary || media.gallery.length > 0));

  return (
    <article className="codex-entry">
      {/* The whole entry — name, summary, image, dossier, body, and relationships
          — is sealed behind its own reveal tier, so an above-teaser entry never
          exposes its identity here. Inside, individual dossier facts and
          relationships can seal at a still-deeper tier. Only the back-link stays
          outside the gate. */}
      <RevealGate
        tier={entry.data.reveal}
        label={`Raise your reveal level to ${TIER_LABELS[entry.data.reveal]} to open this entry.`}
      >
        {media?.banner && (
          <div className="codex-entry__banner">
            <SubjectImage
              source={media.banner.source}
              alt={media.banner.alt || entry.data.name}
              aspect={[16, 6]}
              sizes="(max-width: 820px) 100vw, 760px"
              priority
            />
          </div>
        )}
        <span className="codex-entry__kicker">
          {COLLECTION_LABELS[entry.collection]} · {kicker}
        </span>
        <h1 className="codex-entry__title">{entry.data.name}</h1>
        <p className="codex-entry__summary">{entry.data.summary}</p>
        <div className="codex-rule" />

        {dossier.length > 0 && (
          <dl className="codex-dossier">
            {dossier.map((field) => {
              const row = (
                <div className="codex-dossier__row" key={field.term}>
                  <dt className="codex-dossier__term">{field.term}</dt>
                  <dd className="codex-dossier__value">
                    <DossierValue field={field} />
                  </dd>
                </div>
              );
              // A fact with a deeper tier (e.g. a "Deceased" status) seals on its
              // own even when the entry itself is open; ordinary facts render as
              // a direct <dl> child, unchanged.
              return field.reveal && !isUngated(field.reveal) ? (
                <RevealGate key={field.term} tier={field.reveal}>
                  {row}
                </RevealGate>
              ) : (
                row
              );
            })}
          </dl>
        )}

        {/* Type slots the media reader surfaces per kind: a Place's Map, a
            Faction's Sigil. Empty until authored in Studio, so this renders
            nothing today. */}
        {(media?.map || media?.sigil) && (
          <div className="codex-entry__slots">
            {media.map && (
              <figure className="codex-entry__slot codex-entry__slot--map">
                <SubjectImage
                  source={media.map.source}
                  alt={media.map.alt || `Map of ${entry.data.name}`}
                  fill={false}
                  sizes="(max-width: 760px) 100vw, 680px"
                />
                <figcaption>Map</figcaption>
              </figure>
            )}
            {media.sigil && (
              <figure className="codex-entry__slot codex-entry__slot--sigil">
                <SubjectImage
                  source={media.sigil.source}
                  alt={media.sigil.alt || `Sigil of ${entry.data.name}`}
                  fill={false}
                  sizes="220px"
                />
                <figcaption>Sigil</figcaption>
              </figure>
            )}
          </div>
        )}

        {/* Primary + gallery + lightbox come from Sanity; a git image is the
            fallback (its old "open raw in a new tab" behavior, unchanged). */}
        {hasSanityMedia ? (
          <SubjectGallery
            primary={media!.primary}
            gallery={media!.gallery}
            name={entry.data.name}
          />
        ) : image ? (
          <figure className="codex-entry__media">
            {/* Full-size view opens the raw asset in a new tab — stays a plain <a>. */}
            <a
              href={image}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the full-size character file for ${entry.data.name}`}
            >
              <ContentImage src={image} alt={entry.data.imageAlt ?? entry.data.name} />
            </a>
            <figcaption className="codex-entry__media-hint">Click to view full size</figcaption>
          </figure>
        ) : null}

        <div className="codex-prose">
          <MdxBody source={entry.body} />
        </div>

        {links.length > 0 && (
          <section className="codex-rel">
            <p className="codex-rel__label">Connected threads</p>
            <GatedRelationships links={links} />
          </section>
        )}
      </RevealGate>

      <Link className="codex-back" href="/codex">
        ← All entries
      </Link>
    </article>
  );
}
