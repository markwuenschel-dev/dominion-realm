import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJournalPosts, getJournalEntry, journalKicker, formatJournalDate } from '@/lib/journal';
import { MdxBody } from '@/components/MdxBody';
import { RevealGate } from '@/components/reveal/RevealGate';
import { JournalChrome } from '@/components/journal/JournalChrome';
import { isUngated, TIER_LABELS } from '@/lib/reveal';
import { defaultSocialImage, previewMetadata } from '@/sanity/og';

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
  // Sealed posts inherit generic site metadata so their title/summary don't leak;
  // a teaser post publishes its real title/summary over the default social image
  // (journal posts have no Sanity Subject, so no per-post Primary).
  if (!isUngated(post.data.reveal)) return {};
  return previewMetadata(post.data.title, post.data.summary, await defaultSocialImage());
}

export default async function JournalPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getJournalEntry(id);
  if (!post) notFound();

  return (
    <JournalChrome>
      <article className="journal-post">
        {/* The whole post — header, image, and body — is sealed behind its reveal
            tier so an above-teaser post never exposes its title/summary here. */}
        <RevealGate
          tier={post.data.reveal}
          label={`Raise your reveal level to ${TIER_LABELS[post.data.reveal]} to read this entry.`}
        >
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
              {/* oxlint-disable-next-line next/no-img-element -- dynamic content image, dimensions unknown */}
              <img src={post.data.image} alt={post.data.imageAlt ?? post.data.title} />
            </figure>
          )}

          <div className="journal-prose">
            <MdxBody source={post.body} />
          </div>
        </RevealGate>

        <Link className="journal-back" href="/journal">
          ← All entries
        </Link>
      </article>
    </JournalChrome>
  );
}
