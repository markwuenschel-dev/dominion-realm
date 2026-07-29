import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getReadingEntries,
  readingUrl,
  readingKicker,
  readingMinutes,
  readingContentsPhrase,
  scenePageCount,
} from '@/lib/reading';
import { getSampleDownloads } from '@/lib/downloads';
import { ReadingChrome } from '@/components/reading/ReadingChrome';
import { ContentImage } from '@/components/ContentImage';
import { BuyCta } from '@/components/BuyCta';
import { ContinueReading } from '@/components/reading/ContinueReading';

// A function, not a const: the description names what the sample actually
// contains, which is only knowable once the content files are read.
export function generateMetadata(): Metadata {
  const contents = readingContentsPhrase(getReadingEntries());
  return {
    title: 'Read the Opening',
    description: `Read ${contents} of The Dominion Realm in full — no sign-up, no spoilers, just the opening of the book.`,
  };
}

export default function ReadIndex() {
  const entries = getReadingEntries();
  const first = entries[0];
  const contents = readingContentsPhrase(entries);
  const downloads = getSampleDownloads();
  // `parts` lets the resume island clamp a stale saved scene-page into the
  // chapter's current range instead of linking at a part the route would 404.
  const chapters = entries.map((e) => ({
    id: e.id,
    title: e.data.title,
    url: readingUrl(e.id),
    parts: scenePageCount(e),
  }));

  return (
    <ReadingChrome showIndexLink={false}>
      <div className="reading-head">
        <span className="reading-head__label">The Reading Sample</span>
        <h1 className="reading-head__title">
          Begin the <em>Realm</em>
        </h1>
        <p className="reading-head__intro">
          The opening of the book, in full and unguarded — {contents}. No sign-up, no spoiler gate,
          no catch. Marcus wakes somewhere that isn&apos;t Earth, in a world his implant insists on
          translating into a game. Read until the translation starts to fail.
        </p>
        <div className="reading-rule" />
      </div>

      <ContinueReading chapters={chapters} />

      {first && (
        <Link className="reading-cta" href={readingUrl(first.id)}>
          <span>Start reading</span>
          <span className="reading-cta__hint">{readingKicker(first)}</span>
        </Link>
      )}

      <div className="reading-list">
        {entries.map((entry) => (
          <Link key={entry.id} className="reading-item" href={readingUrl(entry.id)}>
            {entry.data.image && (
              <figure className="reading-item__media">
                <ContentImage
                  src={entry.data.image}
                  alt={entry.data.imageAlt ?? entry.data.title}
                  loading="lazy"
                />
              </figure>
            )}
            <span className="reading-item__kicker">
              {readingKicker(entry)} · ~{readingMinutes(entry.body)} min
            </span>
            <h2 className="reading-item__title">{entry.data.title}</h2>
            <p className="reading-item__summary">{entry.data.summary}</p>
          </Link>
        ))}
      </div>

      <section className="reading-downloads" aria-labelledby="reading-downloads-title">
        <h2 className="reading-downloads__title" id="reading-downloads-title">
          Take the sample with you
        </h2>
        <p className="reading-downloads__intro">
          The same {readingContentsPhrase(entries, { article: false })}, generated from this
          site&apos;s text — for your e-reader or to read offline.
        </p>
        <div className="reading-downloads__row">
          {downloads.map((d) => (
            <a
              key={d.format}
              className="reading-download"
              href={d.href}
              download={d.filename}
              rel="nofollow"
            >
              <span className="reading-download__format">{d.format}</span>
              <span className="reading-download__hint">{d.hint}</span>
              <span className="reading-download__action">Download ↓</span>
            </a>
          ))}
        </div>
      </section>

      <section className="reading-buy" aria-labelledby="reading-buy-title">
        <h2 className="reading-buy__title" id="reading-buy-title">
          Want the whole book?
        </h2>
        <BuyCta note="The full novel is on its way. Be first to know when it lands." />
      </section>
    </ReadingChrome>
  );
}
