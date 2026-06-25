import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJournalPosts, getJournalEntry, journalKicker, formatJournalDate } from '@/lib/journal';
import { MdxBody } from '@/components/MdxBody';
import { RevealGate } from '@/components/reveal/RevealGate';
import { JournalChrome } from '@/components/journal/JournalChrome';

export function generateStaticParams() {
  return getJournalPosts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = getJournalEntry(id);
  if (!post) return {};
  return { title: post.data.title, description: post.data.summary };
}

export default async function JournalPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getJournalEntry(id);
  if (!post) notFound();

  return (
    <JournalChrome>
      <article className="journal-post">
        <span className="journal-post__kicker">{journalKicker(post)}</span>
        <h1 className="journal-post__title">{post.data.title}</h1>
        <p className="journal-post__summary">{post.data.summary}</p>
        {post.data.updatedDate && (
          <span className="journal-post__updated">
            Updated {formatJournalDate(post.data.updatedDate)}
          </span>
        )}
        <div className="codex-rule" />

        {post.data.image && (
          <figure className="journal-post__media">
            <img src={post.data.image} alt={post.data.imageAlt ?? post.data.title} />
          </figure>
        )}

        <div className="journal-prose">
          <RevealGate tier={post.data.reveal}>
            <MdxBody source={post.body} />
          </RevealGate>
        </div>

        <a className="journal-back" href="/journal">
          ← All entries
        </a>
      </article>
    </JournalChrome>
  );
}
