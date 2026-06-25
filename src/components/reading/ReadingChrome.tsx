import Link from 'next/link';
import '@/styles/reading.css';

/**
 * Chrome for the Reading Sample (ported from ReadingLayout.astro): atmosphere
 * overlays, a top bar (home + cross nav), centered reading column, footer.
 * Deliberately NO RevealToggle — the reading sample is fully open and ungated.
 */
export function ReadingChrome({
  children,
  showIndexLink = true,
}: {
  children: React.ReactNode;
  showIndexLink?: boolean;
}) {
  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <div className="reading">
        <header className="reading-top">
          <Link className="reading-top__home" href="/">
            ← The Dominion <em>Realm</em>
          </Link>
          <nav className="reading-top__nav">
            {showIndexLink && <Link href="/read">The Reading</Link>}
            <Link href="/codex">Codex</Link>
            <Link href="/journal">Journal</Link>
            <Link href="/eyes">The Eyes</Link>
          </nav>
        </header>
        <main className="reading-wrap">{children}</main>
        <footer className="reading-footer">The Dominion Realm — Realmwalkers · Book One</footer>
      </div>
    </>
  );
}
