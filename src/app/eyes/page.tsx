import type { Metadata } from 'next';
import Link from 'next/link';
import '@/styles/eyes.css';
import { EyesClient } from '@/components/EyesClient';
import { getSubjectMedia } from '@/sanity/media';
import { urlFor } from '@/sanity/image';

const desc =
  'The Neurochromatic Eyes — six stages of ocular progression onto the spectral substrate. Select a stage to read what the walker sees.';

export const metadata: Metadata = {
  title: { absolute: 'The Neurochromatic Eyes — The Dominion Realm' },
  description: desc,
  openGraph: { title: 'The Neurochromatic Eyes', description: desc },
};

export default async function EyesPage() {
  // Stage art comes from the Neurochromatic Eyes codex concept in Sanity (no SVG).
  // One image per stage if a gallery is set; otherwise the primary is shown across
  // all stages. EyesClient swaps #eyeImg per stage from data-stage-images.
  const media = await getSubjectMedia('concept', 'neurochromatic-eyes');
  const sources = media?.gallery.length
    ? media.gallery.map((g) => g.source)
    : media?.primary
      ? [media.primary.source]
      : [];
  const stageImages = sources.map((s) =>
    urlFor(s).width(900).height(900).fit('crop').auto('format').url(),
  );

  return (
    <>
      <div className="grain" />
      <div className="vignette" />

      <header className="sysbar">
        <div className="left">
          <Link className="back" href="/">
            ← The Dominion <em style={{ fontStyle: 'italic' }}>Realm</em>
          </Link>
          <span className="brand" style={{ opacity: 0.5 }}>
            ·
          </span>
          <span className="brand">
            The Neurochromatic <em>Eyes</em>
          </span>
        </div>
        <div className="sys-readout">
          <span>
            SUBJECT <b>MARCUS</b>
          </span>
          <span className="live" id="liveStage">
            STAGE I
          </span>
          <span>
            DRIFT <b id="driftVal">+0.04</b>
          </span>
        </div>
      </header>

      <section className="intro">
        <div className="intro-glow" />
        <span className="eyebrow">04 — The Power System</span>
        <h1>
          The Neurochromatic <em>Eyes</em>
        </h1>
        <p className="sub">
          Marcus&apos;s emergent interface — <em>distinct</em> from the <em>Eyes of Meszkhal</em>,
          the Unique item he wins in the mindscape bargain. Where the item only interprets, the
          Neurochromatic Eyes <em>perceive</em>: six stages of sight that open wider channels onto
          the spectral substrate, and tell the truth about what they find. Each one costs more than
          the last. Select a stage to read what the walker sees.
        </p>
        <div className="spectral-rule" />
      </section>

      <section className="console">
        <div className="rail" id="rail" role="tablist" aria-label="Ocular stages">
          <div className="rail-title">{'// Progression'}</div>
        </div>

        <div className="viewport">
          <span className="vp-corner tl" />
          <span className="vp-corner tr" />
          <span className="vp-corner bl" />
          <span className="vp-corner br" />
          <div className="vp-head">
            <span>NEUROCHROMATIC IMAGING</span>
            <span id="vpHueName">CYAN BAND</span>
          </div>
          <div className="eye-stage">
            <div className="eye" id="eye">
              {stageImages.length > 0 && (
                // eslint-disable-next-line @next/next/no-img-element -- swapped imperatively per stage by EyesClient
                <img
                  id="eyeImg"
                  className="eye-img"
                  src={stageImages[0]}
                  data-stage-images={JSON.stringify(stageImages)}
                  alt="The Neurochromatic Eyes"
                />
              )}
              <div className="eye-floats" id="floats">
                <span className="f1">λ 488nm</span>
                <span className="f2">θ 0.04</span>
                <span className="f3">∮ stable</span>
                <span className="f4">Δ +1</span>
              </div>
            </div>
          </div>
          <div className="vp-foot">
            <span>
              OCULAR STAGE <b id="vpStage">II — IRIS REFRACTION</b>
            </span>
            <div className="nav-arrows">
              <button id="prevBtn" aria-label="Previous stage">
                ‹
              </button>
              <button id="nextBtn" aria-label="Next stage">
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="data">
          <div className="fade-key" id="dataKey">
            <span className="d-num" id="dNum">
              STAGE II / VI
            </span>
            <h2 className="d-name" id="dName">
              Iris <em>Refraction</em>
            </h2>
            <p className="d-desc" id="dDesc">
              Sight resolves into bands.
            </p>

            <div className="d-block">
              <div className="d-label">What the walker sees</div>
              <p className="d-see" id="dSee">
                —
              </p>
            </div>

            <div className="d-block">
              <div className="d-label">Effect</div>
              <p className="d-effect" id="dEffect">
                —
              </p>
            </div>

            <div className="d-block">
              <div className="d-label">Diagnostics</div>
              <div className="meters">
                <div className="meter perception">
                  <div className="m-head">
                    <span>Perception</span>
                    <span className="m-val" id="mvPerception">
                      0%
                    </span>
                  </div>
                  <div className="track">
                    <i id="mPerception" />
                  </div>
                </div>
                <div className="meter strain">
                  <div className="m-head">
                    <span>Neural strain</span>
                    <span className="m-val" id="mvStrain">
                      0%
                    </span>
                  </div>
                  <div className="track">
                    <i id="mStrain" />
                  </div>
                </div>
                <div className="meter control">
                  <div className="m-head">
                    <span>Control</span>
                    <span className="m-val" id="mvControl">
                      0%
                    </span>
                  </div>
                  <div className="track">
                    <i id="mControl" />
                  </div>
                </div>
              </div>
            </div>

            <div className="cost">
              <div className="c-label">The cost</div>
              <p className="c-text" id="dCost">
                —
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="stepbar">
        <div className="track">
          <div className="fill" id="stepFill" />
          <div className="nodes" id="stepNodes" />
        </div>
        <div className="caption">
          <span>I · Awakening</span>
          <span>VI · Coherence</span>
        </div>
      </div>

      <section className="closer">
        <div className="closer-in">
          <h2>
            The interface is a mercy, not a truth. <em>Marcus is only at Stage I.</em>
          </h2>
          <div className="actions">
            <Link href="/read" className="btn btn-primary">
              Read the Opening <span>→</span>
            </Link>
            <Link href="/codex" className="btn btn-ghost">
              Explore the World <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <EyesClient />
    </>
  );
}
