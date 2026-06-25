import type { Metadata } from 'next';
import '@/styles/reading.css';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About the Author',
  description: 'The author behind The Dominion Realm — an interface-fantasy / LitRPG novel.',
};

export default function AboutPage() {
  const named = SITE.author && !SITE.author.startsWith('[');

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
            <a href="/read">The Reading</a>
            <a href="/codex">Codex</a>
            <a href="/journal">Journal</a>
            <a href="/eyes">The Eyes</a>
          </nav>
        </header>
        <main className="reading-wrap">
          <article className="reading-article">
            <span className="reading-article__kicker">About the Author</span>
            <h1 className="reading-article__title">{named ? SITE.author : 'The Author'}</h1>
            <p className="reading-article__summary">
              Writing interface fantasy from the seam where game logic meets a world that was never
              a game.
            </p>
            <div className="reading-article__rule" />

            <div className="reading-prose">
              <p>
                <em>[ Placeholder bio — Mark to replace. ]</em> {named ? SITE.author : 'The author'}{' '}
                is the author of <em>The Dominion Realm</em>, the first book in the Realmwalkers
                saga: a story about a man who can read the numbers under the world and keeps
                mistaking the translation for the truth.
              </p>
              <p>
                This is where the author&apos;s voice goes — where the idea came from, what
                interface fantasy means to them, and why a health bar can be the most honest lie a
                frightened mind ever tells itself. A paragraph or two of real biography lands here,
                in the author&apos;s own words.
              </p>
              <p>
                For early chapters, field notes, and new codex entries as the Realm fills in, join
                the Realmwalkers from <a href="/">the home page</a> — or step straight into{' '}
                <a href="/read">the opening pages</a>.
              </p>
            </div>

            <a className="reading-back" href="/">
              ← Back to The Dominion Realm
            </a>
          </article>
        </main>
        <footer className="reading-footer">The Dominion Realm — Realmwalkers · Book One</footer>
      </div>
    </>
  );
}
