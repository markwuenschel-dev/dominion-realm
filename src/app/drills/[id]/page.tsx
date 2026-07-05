import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MdxBody } from '@/components/MdxBody';
import { QuestionsChrome } from '@/components/questions/QuestionsChrome';
import { getDrillEntries, getDrillEntry, drillKicker } from '@/lib/drills';
import { LANGUAGE_LABELS, DIFFICULTY_LABELS } from '@/lib/questions';

export function generateStaticParams() {
  return getDrillEntries().map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getDrillEntry(id);
  if (!entry) return {};
  return { title: entry.data.title, description: entry.data.summary };
}

export default async function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getDrillEntry(id);
  if (!entry) notFound();

  const { title, summary, language, difficulty } = entry.data;

  return (
    <QuestionsChrome>
      <article className="question-article">
        <span className="question-article__kicker">{drillKicker(entry)}</span>
        <h1 className="question-article__title">{title}</h1>
        <p className="question-article__summary">{summary}</p>
        <div className="question-article__badges">
          <span className="questions-badge questions-badge--lang">{LANGUAGE_LABELS[language]}</span>
          <span className="questions-badge">{DIFFICULTY_LABELS[difficulty]}</span>
        </div>
        <div className="question-article__rule" />

        <div className="question-prose">
          <MdxBody source={entry.body} />
        </div>

        <Link className="question-back" href="/drills">
          ← All drills
        </Link>
      </article>
    </QuestionsChrome>
  );
}
