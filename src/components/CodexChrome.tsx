import Link from 'next/link';
import { RevealToggle } from '@/components/reveal/RevealToggle';
import '@/styles/codex.css';

/**
 * Shared chrome for the codex-family pages (codex index/entry via the route
 * layout, the journal, and the standalone /relationships constellation):
 * atmosphere overlays, a top bar with home + cross nav, the global RevealToggle
 * that governs spoiler gating, and the footer. Internal nav uses next/link.
 */
const NAV = [
  { href: '/codex', label: 'Codex' },
  { href: '/read', label: 'The Reading' },
  { href: '/journal', label: 'Journal' },
  { href: '/eyes', label: 'The Eyes' },
];

export function CodexChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grain" />
      <div className="vignette" />
      <div className="codex">
        <header className="codex-top">
          <Link className="codex-top__home" href="/">
            ← The Dominion <em>Realm</em>
          </Link>
          <nav className="codex-top__nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
          <RevealToggle />
        </header>
        <main className="codex-wrap">{children}</main>
        <footer className="codex-footer">The Dominion Realm — Realmwalkers · Book One</footer>
      </div>
    </>
  );
}
