import { getDrillEntries, getDrillEntry, type DrillEntry } from './content';
import { CATEGORY_LABELS, LANGUAGE_LABELS } from './questions';

/**
 * Helpers for the Code Drills bank (`/drills`) — a scaffolded sibling of the
 * Questions bank that shares its schema and display vocabulary. It ships empty:
 * the route + collection exist so a future drill-generating chatbot can drop
 * files into `src/content/drills/`, and the nav entry lights up (site.ts) once
 * there is content. Reuses the questions label maps to stay DRY.
 */

export { getDrillEntries, getDrillEntry };
export type { DrillEntry };

/** Canonical URL for a drill (root-served). */
export function drillUrl(id: string): string {
  return `/drills/${id}`;
}

/** Short kicker line for a card / header, e.g. "D001 · Backend / API · Java". */
export function drillKicker(entry: DrillEntry): string {
  const { qid, category, language } = entry.data;
  return `${qid} · ${CATEGORY_LABELS[category]} · ${LANGUAGE_LABELS[language]}`;
}
