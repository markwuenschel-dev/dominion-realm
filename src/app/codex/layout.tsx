import { CodexChrome } from '@/components/CodexChrome';

/**
 * App Router layout for the World Codex (index + entry pages). Delegates to the
 * shared CodexChrome (also used by the journal and the /relationships page).
 */
export default function CodexLayout({ children }: { children: React.ReactNode }) {
  return <CodexChrome>{children}</CodexChrome>;
}
