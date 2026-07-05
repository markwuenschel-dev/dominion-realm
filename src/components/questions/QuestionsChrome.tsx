import Link from 'next/link';
import '@/styles/questions.css';

/**
 * Chrome for the interview-prep section (`/questions` and `/drills`) — the same
 * atmosphere shell as the reading sample, but its own section nav. Deliberately
 * NO RevealToggle: these banks are ungated (no spoiler tiers), same as the
 * reading sample. Shared by both the Questions and Code Drills routes.
 */
export function QuestionsChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <div className="questions">
        <header className="questions-top">
          <Link className="questions-top__home" href="/">
            ← The Dominion <em>Realm</em>
          </Link>
          <nav className="questions-top__nav">
            <Link href="/questions">Questions</Link>
            <Link href="/drills">Code Drills</Link>
            <Link href="/codex">Codex</Link>
          </nav>
        </header>
        <main className="questions-wrap">{children}</main>
        <footer className="questions-footer">
          The Dominion Realm — Interview Prep · Code Diagnosis Bank
        </footer>
      </div>
    </>
  );
}
