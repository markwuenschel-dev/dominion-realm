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
          <a className="reading-top__home" href="/">
            ← The Dominion <em>Realm</em>
          </a>
          <nav className="reading-top__nav">
            {showIndexLink && <a href="/read">The Reading</a>}
            <a href="/codex">Codex</a>
            <a href="/journal">Journal</a>
            <a href="/eyes">The Eyes</a>
          </nav>
        </header>
        <main className="reading-wrap">{children}</main>
        <footer className="reading-footer">The Dominion Realm — Realmwalkers · Book One</footer>
      </div>
    </>
  );
}
