import type { Metadata } from 'next';
import Link from 'next/link';
import { QuestionsChrome } from '@/components/questions/QuestionsChrome';
import {
  getQuestionEntries,
  questionUrl,
  questionKicker,
  QUESTION_CATEGORIES,
  CATEGORY_LABELS,
  LANGUAGE_LABELS,
  DIFFICULTY_LABELS,
  type QuestionEntry,
} from '@/lib/questions';

export const metadata: Metadata = {
  title: 'Questions',
  description:
    'A code-reading, bug-diagnosis, and small-patch interview bank — realistic production-flavored questions across backend, data/ML, React, and SQL, each with a Follow-up probe and Level II / Level III stretches.',
};

export default function QuestionsIndex() {
  const entries = getQuestionEntries();
  const byCategory = QUESTION_CATEGORIES.map((category) => ({
    category,
    items: entries.filter((e) => e.data.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <QuestionsChrome>
      <div className="questions-head">
        <span className="questions-head__label">Interview Prep</span>
        <h1 className="questions-head__title">
          The Code <em>Diagnosis</em> Bank
        </h1>
        <p className="questions-head__intro">
          Read the code, name what it does, find the bug, propose the smallest safe fix, and protect
          it with a test. Every question carries a <strong>Follow-up probe</strong> and two harder
          reps — a <strong>Level II stretch</strong> (SE II) and a{' '}
          <strong>Level III stretch</strong> (SE III) — each with a model answer.
        </p>
      </div>

      {byCategory.map(({ category, items }) => (
        <section className="questions-group" key={category}>
          <h2 className="questions-group__label">{CATEGORY_LABELS[category]}</h2>
          <div className="questions-list">
            {items.map((entry) => (
              <QuestionCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </QuestionsChrome>
  );
}

function QuestionCard({ entry }: { entry: QuestionEntry }) {
  const { title, summary, language, difficulty, tags } = entry.data;
  return (
    <Link className="questions-item" href={questionUrl(entry.id)}>
      <span className="questions-item__kicker">{questionKicker(entry)}</span>
      <h3 className="questions-item__title">{title}</h3>
      <p className="questions-item__summary">{summary}</p>
      <div className="questions-badges">
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
    </Link>
  );
}
