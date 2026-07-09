import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';
import { SITE, liveSocials, NAV_SECTIONS, liveNavPages, navPageReady } from '@/lib/site';
import { getHomeSettings } from '@/lib/homeSettings';
import { getCodexEntry } from '@/lib/codex';
import { getSiteCover, getSubjectPrimaryMap } from '@/sanity/media';
import { HomeClient } from '@/components/HomeClient';
import { BuyCta } from '@/components/BuyCta';
import { MediaPlaceholder } from '@/components/MediaPlaceholder';
import { SubjectImage } from '@/components/SubjectImage';

// The homepage cast cards draw their portraits from each character's Codex entry
// image, so uploading a portrait in Keystatic updates both the card and the codex
// page. Order + blurb are curated here; the picture and name come from content.
const FEATURED_CAST = [
  {
    slug: 'marcus',
    name: 'Marcus Vye',
    role: 'Protagonist · The Ocular Interface',
    desc: 'An Astria machine-learning engineer whose implant renders the Realm as a game. He perceives everything accurately — then reaches, every time, for the wrong conclusion.',
  },
  {
    slug: 'serra-hawthorne',
    name: 'Serra Hawthorne',
    role: 'The Disruptor',
    desc: "The warmest person in the room and the most dangerous. She reads a formation's weak point by feel and is through it before the enemy decides how to respond.",
  },
  {
    slug: 'seb-rainier',
    name: 'Seb Rainier',
    role: 'The Leader',
    desc: "The one who turned a roster of strong individuals into a whole. Marcus's mirror — the same fear of helplessness, the opposite answer: control.",
  },
  {
    slug: 'brent-donovan',
    name: 'Brent Donovan',
    role: 'The Engineer',
    desc: 'A civil engineer who asks the only two questions that matter under pressure: what holds this up, and what makes it fall. When Marcus spirals, Brent is the ground.',
  },
  {
    slug: 'mara-valeria',
    name: 'Mara Valeria',
    role: 'The Observer',
    desc: "She notices everything and draws no notice to herself. The setup to Serra's strike — she has already arranged the moment so the opening exists.",
  },
  {
    slug: 'mathias-sterling',
    name: 'Mathias Sterling',
    role: 'The Scout',
    desc: "A systems mind who reads the connections between things — the group's warm, curious balance-keeper, and the first to see a scattered threat as a single organism.",
  },
] as const;

export default async function Home() {
  const socials = liveSocials();
  const navPages = liveNavPages();
  const { axioms, comps, pubMilestones } = SITE;
  // Media reads follow the Sanity → git → placeholder order (ADR-0011). The cover
  // prefers the Sanity `siteSettings` singleton, falling back to the Keystatic
  // home singleton; each cast portrait prefers its Subject's Primary, falling
  // back to the character's Codex entry image.
  const [sanityCover, portraits] = await Promise.all([getSiteCover(), getSubjectPrimaryMap()]);
  const gitCover = sanityCover ? null : getHomeSettings().cover;
  const hasCover = Boolean(sanityCover || gitCover);
  const cast = FEATURED_CAST.map((c) => {
    const sanity = portraits.get(`character:${c.slug}`);
    return {
      ...c,
      sanity,
      gitImage: getCodexEntry('characters', c.slug)?.data.image,
      imageAlt: sanity?.alt || c.name,
    };
  });
  const mapReady = navPageReady('map');

  const kitFormId = process.env.NEXT_PUBLIC_KIT_FORM_ID;
  const kitAction = kitFormId ? `https://app.kit.com/forms/${kitFormId}/subscriptions` : undefined;

  return (
    <>
      <div className="grain" />
      <div className="vignette" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-title">
            The Dominion <em>Realm</em>
          </span>
        </div>
        <button className="hamburger" id="hamburger" aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
      </header>

      <nav className="mobile-menu" id="mobileMenu">
        {NAV_SECTIONS.map((s) => (
          <a key={s.hash} href={s.hash}>
            <span className="idx">{s.idx}</span> {s.label}
          </a>
        ))}
        {navPages.map((p) => (
          <a key={p.slug} href={`/${p.slug}`}>
            <span className="idx">{p.idx}</span> {p.label}
          </a>
        ))}
      </nav>

      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">An Interface Fantasy</span>
            <span className="brand-title">
              The Dominion <em>Realm</em>
            </span>
          </div>
          <nav className="nav" id="sideNav">
            {NAV_SECTIONS.map((s) => (
              <a key={s.hash} href={s.hash}>
                <span className="idx">{s.idx}</span> {s.label}
              </a>
            ))}
            {navPages.map((p) => (
              <a key={p.slug} href={`/${p.slug}`}>
                <span className="idx">{p.idx}</span> {p.label}
              </a>
            ))}
          </nav>
          <div className="sidebar-foot">
            Realmwalkers <span>·</span> Book One
            <br />
            Est. <span>MMXXVI</span>
          </div>
        </aside>

        <main className="main">
          {/* HERO */}
          <section className={`hero${hasCover ? ' has-cover' : ''}`} id="hero">
            <div className="hero-glow a" />
            <div className="hero-glow b" />
            <div className="hero-glow c" />
            <div className="wrap">
              <div className="hero-copy">
                <span className="hero-genre reveal">Interface Fantasy / LitRPG</span>
                <h1 className="hero-title reveal">
                  <span className="the">The Dominion</span>
                  <em>Realm</em>
                </h1>
                <p className="hero-logline reveal">
                  An Earth gamer&apos;s cybernetic implant translates a real metaphysical world into
                  RPG logic — until he realizes the interface is not the world.{' '}
                  <em>It is only his way of surviving contact with it.</em>
                </p>
                <div className="buy-row reveal">
                  <Link href="/read" className="btn btn-primary">
                    Read the Opening <span className="arrow">→</span>
                  </Link>
                  <Link href="/codex" className="btn btn-ghost">
                    Explore the World <span className="arrow">→</span>
                  </Link>
                  <span className="buy-note">Prologue &amp; Chapter One · free, no sign-up</span>
                  <BuyCta className="buy-cta--hero" newsletterHref="#join" />
                </div>
              </div>
              {hasCover && (
                <figure className="hero-cover reveal">
                  {sanityCover ? (
                    <SubjectImage
                      source={sanityCover.source}
                      alt={sanityCover.alt}
                      fill
                      objectFit="contain"
                      sizes="(max-width: 980px) 60vw, 340px"
                      priority
                    />
                  ) : (
                    <Image
                      src={gitCover!.src}
                      alt={gitCover!.alt}
                      fill
                      sizes="(max-width: 980px) 60vw, 340px"
                      style={{ objectFit: 'contain' }}
                      priority
                    />
                  )}
                </figure>
              )}
            </div>
            <div className="scroll-cue">
              <span>Scroll</span>
              <span className="bar" />
            </div>
          </section>

          {/* THE STORY */}
          <section className="band" id="story">
            <div className="wrap">
              <div className="sec-head reveal">
                <span className="sec-label">01 — The Story</span>
                <h2 className="sec-title">
                  A world that was never <em>a game</em>
                </h2>
                <div className="spectral-rule" />
              </div>
              <div className="story-body">
                <p className="dropcap reveal">
                  <span className="lead">
                    Six of Earth&apos;s most gifted gamers are manipulated by Astria into an
                    experiment they barely understand
                  </span>{' '}
                  — the implantation of an experimental neuroquantum lattice, threaded directly into
                  the optic nerve. When they wake, they are no longer on Earth. They are in the
                  Realm: a real, breathing metaphysical world that answers to laws older than
                  language.
                </p>
                <p className="reveal">
                  Marcus, the protagonist, sees it differently than the others. His implant renders
                  the Realm as RPG logic — health bars, skill trees, loot, levels. It is legible. It
                  is survivable. But the power humming beneath the interface is not code, and it was
                  not built for him. It is ancient, and it is real.
                </p>
                <p className="reveal">
                  The deeper he descends, the more the abstraction frays. The numbers are a mercy,
                  not a truth — a fragile membrane between a fragile mind and something that does
                  not care to be understood. To master the Realm, Marcus must first accept that
                  everything he can read about it is a translation. And every translation leaves
                  something out.
                </p>
              </div>
              {comps.length > 0 && (
                <p className="comps reveal">
                  <span className="comps-label">For readers of</span>
                  <span className="comps-list">{comps.join(' · ')}</span>
                </p>
              )}
            </div>
          </section>

          {/* CHARACTERS */}
          <section className="band raise" id="characters">
            <div className="wrap">
              <div className="sec-head reveal">
                <span className="sec-label">02 — Dramatis Personae</span>
                <h2 className="sec-title">
                  Those who <em>walk in</em>
                </h2>
                <div className="spectral-rule" />
              </div>
              <div className="char-grid">
                {cast.map((c) => (
                  <Link
                    key={c.slug}
                    className="char-card reveal"
                    href={`/codex/characters/${c.slug}`}
                  >
                    <div className="char-portrait">
                      {c.sanity ? (
                        <SubjectImage
                          source={c.sanity.source}
                          alt={c.imageAlt}
                          aspect={[3, 4]}
                          sizes="(max-width:980px) 100vw, 300px"
                        />
                      ) : c.gitImage ? (
                        <Image
                          src={c.gitImage}
                          alt={c.imageAlt}
                          fill
                          sizes="(max-width:980px) 100vw, 300px"
                          style={{ objectFit: 'cover', objectPosition: 'top' }}
                        />
                      ) : (
                        <MediaPlaceholder label={c.name} />
                      )}
                    </div>
                    <span className="char-role">{c.role}</span>
                    <h3 className="char-name">{c.name}</h3>
                    <p className="char-desc">{c.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* THE WORLD */}
          <section className="band" id="world">
            <div className="wrap">
              <div className="sec-head reveal">
                <span className="sec-label">03 — The World</span>
                <h2 className="sec-title">
                  Convergence &amp; <em>contagion</em>
                </h2>
                <div className="spectral-rule" />
              </div>
              <div className="world-cols reveal">
                <div className="world-col">
                  <div className="glow-tab" />
                  <div className="world-kicker">The Place</div>
                  <h3 className="world-name">
                    Eriadne, <em>the Thread City</em>
                  </h3>
                  <p className="world-sub">Where the eight ley lines meet.</p>
                  <p className="world-text">
                    Eriadne was never built — it accreted over a trade crossroads that happened to
                    sit above the convergence of the eight elemental ley lines, with ancient ruins
                    on its outskirts. It has no rulers, only reputation; power here is relationship
                    and consequence. And the ruins answer to something older than the city that grew
                    beside them.
                  </p>
                </div>
                <div className="world-col">
                  <div className="glow-tab" />
                  <div className="world-kicker">The Threats</div>
                  <h3 className="world-name">
                    Two kinds of <em>ending</em>
                  </h3>
                  <div className="threat-row">
                    <div className="threat x">
                      <h4>The Xyloryn</h4>
                      <p>
                        A biological, adaptive swarm. It learns what kills it and stops dying. To
                        fight it twice the same way is to lose.
                      </p>
                    </div>
                    <div className="vs-mark">versus</div>
                    <div className="threat z">
                      <h4>The N&apos;hal</h4>
                      <p>
                        Ontological predators that denature reality itself. Where they pass, names
                        detach, places stop being locatable — and the interface goes dark.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {mapReady && (
                <p className="world-map-teaser reveal">
                  <Link href="/map">
                    See the Realm drawn — the map of Eriadne and beyond{' '}
                    <span className="arrow">→</span>
                  </Link>
                </p>
              )}
            </div>
          </section>

          {/* POWER SYSTEM */}
          <section className="band raise" id="power">
            <div className="wrap">
              <div className="sec-head reveal">
                <span className="sec-label">04 — The Power System</span>
                <h2 className="sec-title">
                  The Neurochromatic <em>Eyes</em>
                </h2>
                <div className="spectral-rule" />
              </div>
              <p className="power-intro reveal">
                Marcus&apos;s emergent ocular interface — the progression of sight that lets a
                walker perceive, and eventually command, the spectral substrate beneath the
                interface. Six stages. Each one costs more than the last. (Not to be confused with
                the Eyes of Meszkhal, a separate item that only sounds certain.)
              </p>
              <div className="rail">
                <div
                  className="stage reveal"
                  style={{ ['--node-glow']: 'rgba(79,214,224,0.7)' } as React.CSSProperties}
                >
                  <span className="node" />
                  <span className="stage-num">STAGE I</span>
                  <h3 className="stage-name">Limbal Shift</h3>
                  <p className="stage-desc">
                    The first awakening. The edge of the iris begins to refract ambient spectral
                    light — the walker sees that the Realm is layered, even if they cannot yet read
                    the layers.
                  </p>
                </div>
                <div
                  className="stage reveal"
                  style={{ ['--node-glow']: 'rgba(91,141,239,0.7)' } as React.CSSProperties}
                >
                  <span className="node" />
                  <span className="stage-num">STAGE II</span>
                  <h3 className="stage-name">Iris Refraction</h3>
                  <p className="stage-desc">
                    Sight resolves into bands. Threats, leylines, and intentions take on color and
                    weight. The interface stabilizes into something a mind can hold.
                  </p>
                </div>
                <div
                  className="stage reveal"
                  style={{ ['--node-glow']: 'rgba(123,124,240,0.75)' } as React.CSSProperties}
                >
                  <span className="node" />
                  <span className="stage-num">STAGE III</span>
                  <h3 className="stage-name">Neuro-Optical Overdrive</h3>
                  <p className="stage-desc">
                    Perception outpaces the body. The walker reads faster than they can act — a
                    dangerous gap where seeing too much can break the one who sees.
                  </p>
                </div>
                <div
                  className="stage reveal"
                  style={{ ['--node-glow']: 'rgba(155,108,240,0.75)' } as React.CSSProperties}
                >
                  <span className="node" />
                  <span className="stage-num">STAGE IV</span>
                  <h3 className="stage-name">Spectral Partition</h3>
                  <p className="stage-desc">
                    The eye learns to split the substrate into discrete channels — isolating a
                    single thread of reality and holding it apart from the rest. The first true act
                    of command.
                  </p>
                </div>
                <div
                  className="stage reveal"
                  style={{ ['--node-glow']: 'rgba(239,111,158,0.75)' } as React.CSSProperties}
                >
                  <span className="node" />
                  <span className="stage-num">STAGE V</span>
                  <h3 className="stage-name">Gaze Interference</h3>
                  <p className="stage-desc">
                    To look is to alter. The walker&apos;s attention becomes a force — bending,
                    dampening, or amplifying what they fix upon. Reality flinches under the gaze.
                  </p>
                </div>
                <div
                  className="stage reveal"
                  style={{ ['--node-glow']: 'rgba(224,168,80,0.8)' } as React.CSSProperties}
                >
                  <span className="node" />
                  <span className="stage-num">STAGE VI</span>
                  <h3 className="stage-name">Prism Coherence</h3>
                  <p className="stage-desc">
                    All bands resolve into one. The interface dissolves; the walker no longer
                    translates the Realm — they perceive it whole, and unmediated. Few survive the
                    clarity.
                  </p>
                </div>
              </div>
              <div className="reveal" style={{ marginTop: '2.4rem', textAlign: 'center' }}>
                <Link href="/eyes" className="btn btn-primary">
                  Enter the Neurochromatic Eyes <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* THE AXIOMS */}
          {axioms.length >= 2 && (
            <section className="band" id="axioms">
              <div className="wrap">
                <div className="sec-head reveal">
                  <span className="sec-label">05 — The Axioms</span>
                  <h2 className="sec-title">
                    The laws beneath <em>the laws</em>
                  </h2>
                  <div className="spectral-rule" />
                </div>
                <ol className="axioms">
                  {axioms.map((ax) => (
                    <li className="axiom reveal" key={ax.numeral}>
                      <span className="axiom-num">{ax.numeral}</span>
                      <div className="axiom-body">
                        <p className="axiom-text">
                          {ax.text.split(' / ').map((line, i) => (
                            <Fragment key={i}>
                              {i > 0 && <br />}
                              {line}
                            </Fragment>
                          ))}
                        </p>
                        {ax.gloss && <p className="axiom-gloss">{ax.gloss}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {/* PULL QUOTE */}
          <section className="pull">
            <div className="hero-glow c" style={{ top: '10%', left: '50%', opacity: 0.6 }} />
            <div className="pull-inner reveal">
              <blockquote>
                <p>
                  One substrate.
                  <br />
                  Many <em>interfaces.</em>
                </p>
                <cite>— The First Axiom of the Realm</cite>
              </blockquote>
            </div>
          </section>

          {/* PUBLICATION TIMELINE */}
          {pubMilestones.length > 0 && (
            <section className="band raise" id="timeline">
              <div className="wrap">
                <div className="sec-head reveal">
                  <span className="sec-label">06 — The Road to Publication</span>
                  <h2 className="sec-title">
                    From first page to <em>first reader</em>
                  </h2>
                  <div className="spectral-rule" />
                </div>
                <ol className="timeline">
                  {pubMilestones.map((m, i) => (
                    <li className={`milestone reveal${m.done ? ' is-done' : ''}`} key={i}>
                      <span className="milestone-when">{m.when}</span>
                      <span className="milestone-dot" />
                      <span className="milestone-what">{m.what}</span>
                    </li>
                  ))}
                </ol>
                <p className="timeline-cta reveal">
                  <a href="#join">
                    Be first to know <span className="arrow">→</span>
                  </a>
                </p>
              </div>
            </section>
          )}

          {/* FOOTER / JOIN */}
          <footer className="footer" id="join">
            <div className="wrap">
              <div className="foot-grid">
                <div className="reveal">
                  <h2 className="foot-title">
                    Walk in <em>first.</em>
                  </h2>
                  <p className="foot-meta">
                    The Dominion Realm
                    <br />
                    <span>Realmwalkers</span> · Book One
                    <br />A novel by{' '}
                    <Link className="foot-author" href="/about">
                      {SITE.author}
                    </Link>
                  </p>
                  {socials.length > 0 && (
                    <div className="socials">
                      {socials.map((s) => (
                        <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer me">
                          {s.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="reveal">
                  <span className="signup-label">Join the Realmwalkers</span>
                  <form className="signup-form" id="signupForm" action={kitAction} method="post">
                    <input
                      type="email"
                      name="email_address"
                      placeholder="your@email.com"
                      aria-label="Email"
                      required
                    />
                    <button type="submit">Enter</button>
                  </form>
                  <p className="signup-note" id="signupNote">
                    Early chapters · field notes · new codex entries
                  </p>
                </div>
              </div>
              <div className="foot-base">
                <span>© MMXXVI — The Dominion Realm</span>
                <span>An Interface Fantasy</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <HomeClient />
    </>
  );
}
