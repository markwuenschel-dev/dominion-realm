import { CodexChrome } from '@/components/CodexChrome';
import '@/styles/journal.css';

/**
 * Chrome for the Author Journal — the same shell as the codex (shared via
 * CodexChrome), plus the journal-specific stylesheet.
 */
export function JournalChrome({ children }: { children: React.ReactNode }) {
  return <CodexChrome>{children}</CodexChrome>;
}
