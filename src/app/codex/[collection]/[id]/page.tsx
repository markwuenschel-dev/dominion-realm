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
import { RevealGate } from '@/components/reveal/RevealGate';

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
  return { title: entry.data.name, description: entry.data.summary };
}

export default async function CodexEntryPage({ params }: { params: Promise<Params> }) {
  const { collection, id } = await params;
  const entry = getCodexEntry(collection as CodexCollection, id);
  if (!entry) notFound();

  const kicker = entryKicker(entry);
  const links = resolveRelationships(entry, getCodexEntries());
  const dossier = dossierFields(entry);
  const image = entry.data.image;

  return (
    <article className="codex-entry">
      <span className="codex-entry__kicker">
        {COLLECTION_LABELS[entry.collection]} · {kicker}
      </span>
      <h1 className="codex-entry__title">{entry.data.name}</h1>
      <p className="codex-entry__summary">{entry.data.summary}</p>
      <div className="codex-rule" />

      {dossier.length > 0 && (
        <dl className="codex-dossier">
          {dossier.map((field) => (
            <div className="codex-dossier__row" key={field.term}>
              <dt className="codex-dossier__term">{field.term}</dt>
              <dd className="codex-dossier__value">
                <DossierValue field={field} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {image && (
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
      )}

      <div className="codex-prose">
        <RevealGate tier={entry.data.reveal}>
          <MdxBody source={entry.body} />
        </RevealGate>
      </div>

      {links.length > 0 && (
        <section className="codex-rel">
          <p className="codex-rel__label">Connected threads</p>
          <div className="codex-rel__list">
            {links.map((link) => (
              <Link className="codex-rel__item" href={link.url} key={link.url}>
                {link.label && <span className="codex-rel__rel">{link.label}</span>}
                <span>{link.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link className="codex-back" href="/codex">
        ← All entries
      </Link>
    </article>
  );
}
