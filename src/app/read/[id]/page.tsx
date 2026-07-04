import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getReadingEntries,
  getReadingEntry,
  readingUrl,
  readingKicker,
  getNeighbors,
} from '@/lib/reading';
import { MdxBody } from '@/components/MdxBody';
import { ContentImage } from '@/components/ContentImage';
import { ReadingChrome } from '@/components/reading/ReadingChrome';

export function generateStaticParams() {
  return getReadingEntries().map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getReadingEntry(id);
  if (!entry) return {};
  return { title: entry.data.title, description: entry.data.summary };
}

export default async function ReadChapter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getReadingEntry(id);
  if (!entry) notFound();

  const { prev, next } = getNeighbors(getReadingEntries(), id);

  return (
    <ReadingChrome>
      <article className="reading-article">
        <span className="reading-article__kicker">{readingKicker(entry)}</span>
        <h1 className="reading-article__title">{entry.data.title}</h1>
        <p className="reading-article__summary">{entry.data.summary}</p>
        <div className="reading-article__rule" />

        {entry.data.image && (
          <figure className="reading-article__media">
            <ContentImage src={entry.data.image} alt={entry.data.imageAlt ?? entry.data.title} />
          </figure>
        )}

        <div className="reading-prose">
          <MdxBody source={entry.body} />
        </div>
      </article>

      {(prev || next) && (
        <nav className="reading-nav" aria-label="Chapter navigation">
          {prev && (
            <Link className="reading-nav__link reading-nav__link--prev" href={readingUrl(prev.id)}>
              <span className="reading-nav__dir">← Previous</span>
              <span className="reading-nav__title">{prev.data.title}</span>
            </Link>
          )}
          {next && (
            <Link className="reading-nav__link reading-nav__link--next" href={readingUrl(next.id)}>
              <span className="reading-nav__dir">Next →</span>
              <span className="reading-nav__title">{next.data.title}</span>
            </Link>
          )}
        </nav>
      )}

      <Link className="reading-back" href="/read">
        ← All chapters
      </Link>
    </ReadingChrome>
  );
}
