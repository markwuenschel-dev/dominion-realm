import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MdxBody } from '@/components/MdxBody';
import { QuestionsChrome } from '@/components/questions/QuestionsChrome';
import {
  getQuestionEntries,
  getQuestionEntry,
  getQuestionNeighbors,
  questionUrl,
  questionKicker,
  LANGUAGE_LABELS,
  DIFFICULTY_LABELS,
} from '@/lib/questions';

export function generateStaticParams() {
  return getQuestionEntries().map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getQuestionEntry(id);
  if (!entry) return {};
  return { title: entry.data.title, description: entry.data.summary };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getQuestionEntry(id);
  if (!entry) notFound();

  const { prev, next } = getQuestionNeighbors(getQuestionEntries(), id);
  const { title, summary, language, difficulty, tags } = entry.data;

  return (
    <QuestionsChrome>
      <article className="question-article">
        <span className="question-article__kicker">{questionKicker(entry)}</span>
        <h1 className="question-article__title">{title}</h1>
        <p className="question-article__summary">{summary}</p>
        <div className="question-article__badges">
          <span className="questions-badge questions-badge--lang">{LANGUAGE_LABELS[language]}</span>
          <span
            className={`questions-badge${difficulty === 'senior' ? ' questions-badge--senior' : ''}`}
          >
            {DIFFICULTY_LABELS[difficulty]}
          </span>
          {tags.map((tag) => (
            <span className="questions-badge" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="question-article__rule" />

        {/* Ungated (no RevealGate) — same posture as the reading sample. */}
        <div className="question-prose">
          <MdxBody source={entry.body} />
        </div>

        {(prev || next) && (
          <nav className="question-nav" aria-label="Question navigation">
            {prev && (
              <Link
                className="question-nav__link question-nav__link--prev"
                href={questionUrl(prev.id)}
              >
                <span className="question-nav__dir">← Previous</span>
                <span className="question-nav__title">{prev.data.title}</span>
              </Link>
            )}
            {next && (
              <Link
                className="question-nav__link question-nav__link--next"
                href={questionUrl(next.id)}
              >
                <span className="question-nav__dir">Next →</span>
                <span className="question-nav__title">{next.data.title}</span>
              </Link>
            )}
          </nav>
        )}

        <Link className="question-back" href="/questions">
          ← All questions
        </Link>
      </article>
    </QuestionsChrome>
  );
}
