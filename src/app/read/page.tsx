import type { Metadata } from 'next';
import { getReadingEntries, readingUrl, readingKicker } from '@/lib/reading';
import { ReadingChrome } from '@/components/reading/ReadingChrome';

export const metadata: Metadata = {
  title: 'Read the Opening',
  description:
    'Read the Prologue and Chapter One of The Dominion Realm in full — no sign-up, no spoilers, just the opening of the book.',
};

export default function ReadIndex() {
  const entries = getReadingEntries();
  const first = entries[0];

  return (
    <ReadingChrome showIndexLink={false}>
      <div className="reading-head">
        <span className="reading-head__label">The Reading Sample</span>
        <h1 className="reading-head__title">
          Begin the <em>Realm</em>
        </h1>
        <p className="reading-head__intro">
          The opening of the book, in full and unguarded — the Prologue and Chapter One. No sign-up,
          no spoiler gate, no catch. Marcus wakes somewhere that isn&apos;t Earth, in a world his
          implant insists on translating into a game. Read until the translation starts to fail.
        </p>
        <div className="reading-rule" />
      </div>

      {first && (
        <a className="reading-cta" href={readingUrl(first.id)}>
          <span>Start reading</span>
          <span className="reading-cta__hint">{readingKicker(first)}</span>
        </a>
      )}

      <div className="reading-list">
        {entries.map((entry) => (
          <a key={entry.id} className="reading-item" href={readingUrl(entry.id)}>
            {entry.data.image && (
              <figure className="reading-item__media">
                <img
                  src={entry.data.image}
                  alt={entry.data.imageAlt ?? entry.data.title}
                  loading="lazy"
                />
              </figure>
            )}
            <span className="reading-item__kicker">{readingKicker(entry)}</span>
            <h2 className="reading-item__title">{entry.data.title}</h2>
            <p className="reading-item__summary">{entry.data.summary}</p>
          </a>
        ))}
      </div>
    </ReadingChrome>
  );
}
