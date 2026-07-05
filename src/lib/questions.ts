import { getQuestionEntries, getQuestionEntry, type QuestionEntry } from './content';

/**
 * Helpers for the Questions bank (`/questions`): an ungated collection of
 * realistic code-reading / bug-diagnosis interview questions. Each entry's body
 * carries the full prompt, expected answer, the Follow-up probe, and the new
 * Level II / Level III stretches. Like `reading`, this collection has no reveal
 * tier — the loader only draft-filters (in prod) and sorts by `order`.
 */

export { getQuestionEntries, getQuestionEntry };
export type { QuestionEntry };

export type QuestionCategory = QuestionEntry['data']['category'];
export type QuestionLanguage = QuestionEntry['data']['language'];
export type QuestionDifficulty = QuestionEntry['data']['difficulty'];

/** Ordered categories — drives the grouping on the index page. */
export const QUESTION_CATEGORIES: QuestionCategory[] = [
  'backend',
  'python-ml',
  'react-ts',
  'sql',
  'algorithms',
  'testing',
  'concurrency',
];

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  backend: 'Backend / API',
  'python-ml': 'Python / Data-ML',
  'react-ts': 'React / TypeScript',
  sql: 'SQL & Data Access',
  algorithms: 'Algorithms',
  testing: 'Testing & Review',
  concurrency: 'Java / Concurrency',
};

export const LANGUAGE_LABELS: Record<QuestionLanguage, string> = {
  java: 'Java',
  python: 'Python',
  typescript: 'TypeScript',
  sql: 'SQL',
};

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  mid: 'Mid · SE II',
  senior: 'Senior · SE III',
};

/** Canonical URL for a question (root-served). */
export function questionUrl(id: string): string {
  return `/questions/${id}`;
}

/** Short kicker line for a card / header, e.g. "Q001 · Backend / API · Java". */
export function questionKicker(entry: QuestionEntry): string {
  const { qid, category, language } = entry.data;
  return `${qid} · ${CATEGORY_LABELS[category]} · ${LANGUAGE_LABELS[language]}`;
}

export interface QuestionNeighbors {
  prev?: QuestionEntry;
  next?: QuestionEntry;
}

/** Resolve previous/next questions around an entry within an already-sorted list. */
export function getQuestionNeighbors(entries: QuestionEntry[], id: string): QuestionNeighbors {
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return {};
  return {
    prev: index > 0 ? entries[index - 1] : undefined,
    next: index < entries.length - 1 ? entries[index + 1] : undefined,
  };
}
