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
                I wrote <em>Realmwalkers</em> because I wanted the fantasy I kept looking for and
                never found — the one where all the things I love share a single universe. The
                powers, the magic systems, the fighting styles, the worlds. Not as a gimmick, but as
                a real place where they collide, strike bargains, and force each other to make
                sense.
              </p>
              <p>
                It runs at two scales at once. Above, there are cosmic factions, ancient threats,
                and systems large enough to reshape worlds. Below, there is a small party of
                dangerously capable people — each with their own specialty, their own independence,
                and real consequences when they fail one another. The Realm is vast; the story is
                the handful of people trying to survive it together.
              </p>
              <p>
                I love watching a character get measurably stronger on the page, so there is real
                machinery under this world: classes, stats, biology, the interface itself. But you
                won&apos;t be doing homework. The math is there to make the wonder hold weight — so
                that when someone is hurt, transformed, or pushed past their limit, the world has
                rules beneath it and the cost is real.
              </p>
              <p>
                At the center is a romance that spans the whole series — two strangers becoming
                something larger and stranger and harder than any simple love story — surrounded by
                the friendships, rivalries, and quiet betrayals that come with it. Every character
                carries a piece of me, or of someone who shaped me. The aim was never to feel
                generic: familiar enough that you recognize what you love, distinct enough that it
                becomes something new.
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
