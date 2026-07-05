import type { Metadata } from 'next';
import Link from 'next/link';
import { QuestionsChrome } from '@/components/questions/QuestionsChrome';
import { getDrillEntries, drillUrl, drillKicker } from '@/lib/drills';
import { LANGUAGE_LABELS, DIFFICULTY_LABELS } from '@/lib/questions';

export const metadata: Metadata = {
  title: 'Code Drills',
  description:
    'Generated code-diagnosis drills — the same read-diagnose-fix-test format as the Questions bank, produced on demand. Scaffolded and ready for content.',
};

export default function DrillsIndex() {
  const entries = getDrillEntries();

  return (
    <QuestionsChrome>
      <div className="questions-head">
        <span className="questions-head__label">Interview Prep</span>
        <h1 className="questions-head__title">
          Code <em>Drills</em>
        </h1>
        <p className="questions-head__intro">
          Fresh reps in the same read-diagnose-fix-test format as the{' '}
          <Link href="/questions">Questions bank</Link>, generated on demand. This is where new
          drills will land.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="questions-empty">
          No drills yet. This bank is wired and waiting — once the drill generator is connected,
          generated drills drop into <code>src/content/drills/</code> and appear here automatically.
        </p>
      ) : (
        <section className="questions-group">
          <div className="questions-list">
            {entries.map((entry) => (
              <Link className="questions-item" href={drillUrl(entry.id)} key={entry.id}>
                <span className="questions-item__kicker">{drillKicker(entry)}</span>
                <h3 className="questions-item__title">{entry.data.title}</h3>
                <p className="questions-item__summary">{entry.data.summary}</p>
                <div className="questions-badges">
                  <span className="questions-badge questions-badge--lang">
                    {LANGUAGE_LABELS[entry.data.language]}
                  </span>
                  <span className="questions-badge">
                    {DIFFICULTY_LABELS[entry.data.difficulty]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </QuestionsChrome>
  );
}
