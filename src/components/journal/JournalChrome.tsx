import { RevealToggle } from '@/components/reveal/RevealToggle';
import '@/styles/codex.css';
import '@/styles/journal.css';

/**
 * Chrome for the Author Journal (ported from CodexLayout.astro — the journal
 * reused the codex chrome). Atmosphere overlays, a top bar with home + cross
 * nav, the global RevealToggle, and a footer. Uses the existing `.codex*`
 * classes from codex.css.
 */
export function JournalChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <div className="codex">
        <header className="codex-top">
          <a className="codex-top__home" href="/">
            ← The Dominion <em>Realm</em>
          </a>
          <nav className="codex-top__nav">
            <a href="/codex">Codex</a>
            <a href="/read">The Reading</a>
            <a href="/journal">Journal</a>
            <a href="/eyes">The Eyes</a>
          </nav>
          <RevealToggle />
        </header>
        <main className="codex-wrap">{children}</main>
        <footer className="codex-footer">The Dominion Realm — Realmwalkers · Book One</footer>
      </div>
    </>
  );
}
