import type { Metadata } from 'next';
import Link from 'next/link';
import '@/styles/eyes.css';
import { EyesClient } from '@/components/EyesClient';

const desc =
  'The Neurochromatic Eyes — six stages of ocular progression onto the spectral substrate. Select a stage to read what the walker sees.';

export const metadata: Metadata = {
  title: { absolute: 'The Neurochromatic Eyes — The Dominion Realm' },
  description: desc,
  openGraph: { title: 'The Neurochromatic Eyes', description: desc },
};

// The hand-tuned procedural eye is injected verbatim (it is driven entirely by
// EyesClient via element ids); this avoids converting ~150 SVG attributes to JSX.
const EYE_HTML = `
<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" id="eye-svg">
  <defs>
    <radialGradient id="grd-sclera" cx="50%" cy="46%" r="54%">
      <stop offset="0%" stop-color="#10101a"></stop>
      <stop offset="72%" stop-color="#0c0c16"></stop>
      <stop offset="100%" stop-color="#060610"></stop>
    </radialGradient>
    <radialGradient id="grd-iris" cx="50%" cy="50%" r="50%">
      <stop id="ig0" offset="0%" stop-color="#4fd6e0" stop-opacity="0.0"></stop>
      <stop id="ig1" offset="28%" stop-color="#4fd6e0" stop-opacity="0.55"></stop>
      <stop id="ig2" offset="58%" stop-color="#0a0816" stop-opacity="1"></stop>
      <stop id="ig3" offset="100%" stop-color="#060612" stop-opacity="1"></stop>
    </radialGradient>
    <radialGradient id="grd-sheen" cx="38%" cy="34%" r="70%">
      <stop offset="0%" stop-color="white" stop-opacity="0.18"></stop>
      <stop offset="40%" stop-color="white" stop-opacity="0.04"></stop>
      <stop offset="100%" stop-color="white" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="grd-pupil" cx="44%" cy="40%" r="56%">
      <stop id="pg0" offset="0%" stop-color="#1a0a2e"></stop>
      <stop offset="60%" stop-color="#050508"></stop>
      <stop offset="100%" stop-color="#000"></stop>
    </radialGradient>
    <radialGradient id="grd-limbal-halo" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stop-color="transparent"></stop>
      <stop id="lh0" offset="85%" stop-color="#4fd6e0" stop-opacity="0.0"></stop>
      <stop id="lh1" offset="100%" stop-color="#4fd6e0" stop-opacity="0.0"></stop>
    </radialGradient>
    <radialGradient id="grd-sweep" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.0"></stop>
      <stop id="sw0" offset="55%" stop-color="#4fd6e0" stop-opacity="0.12"></stop>
      <stop offset="100%" stop-color="#4fd6e0" stop-opacity="0.0"></stop>
    </radialGradient>
    <filter id="f-iris-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="b"></feGaussianBlur>
      <feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
    <filter id="f-limbal" x="-14%" y="-14%" width="128%" height="128%">
      <feGaussianBlur stdDeviation="4.5" result="b"></feGaussianBlur>
      <feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
    <filter id="f-pupil-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b"></feGaussianBlur>
      <feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
    <filter id="f-fiber-blur" x="-4%" y="-4%" width="108%" height="108%">
      <feGaussianBlur stdDeviation="0.6"></feGaussianBlur>
    </filter>
    <filter id="f-vein" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.2" result="b"></feGaussianBlur>
      <feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
    </filter>
    <clipPath id="cp-iris"><circle cx="160" cy="160" r="90"></circle></clipPath>
    <clipPath id="cp-eye"><circle cx="160" cy="160" r="155"></circle></clipPath>
  </defs>

  <circle cx="160" cy="160" r="155" fill="url(#grd-sclera)"></circle>

  <g id="veins" clip-path="url(#cp-eye)" opacity="0" style="transition:opacity 1s ease">
    <path d="M90,100 Q110,130 95,160 Q82,185 100,210" stroke="#c0393a" stroke-width="0.8" fill="none" opacity="0.5" filter="url(#f-vein)"></path>
    <path d="M95,160 Q108,172 105,195" stroke="#c0393a" stroke-width="0.5" fill="none" opacity="0.35" filter="url(#f-vein)"></path>
    <path d="M230,95 Q210,125 225,158 Q236,182 218,210" stroke="#c0393a" stroke-width="0.7" fill="none" opacity="0.45" filter="url(#f-vein)"></path>
    <path d="M225,158 Q212,170 216,196" stroke="#c0393a" stroke-width="0.45" fill="none" opacity="0.3" filter="url(#f-vein)"></path>
    <path d="M140,75 Q145,95 138,115" stroke="#c0393a" stroke-width="0.5" fill="none" opacity="0.3" filter="url(#f-vein)"></path>
    <path d="M178,75 Q174,94 180,114" stroke="#c0393a" stroke-width="0.5" fill="none" opacity="0.28" filter="url(#f-vein)"></path>
  </g>

  <circle id="limbal-halo" cx="160" cy="160" r="155" fill="url(#grd-limbal-halo)" style="transition:opacity 0.8s ease"></circle>

  <circle id="iris-base" cx="160" cy="160" r="90" fill="url(#grd-iris)" filter="url(#f-iris-glow)" style="transition:filter 0.8s ease"></circle>

  <g id="iris-fibers" clip-path="url(#cp-iris)">
    <g id="spokes-primary" filter="url(#f-fiber-blur)" style="transition:opacity 0.7s ease">
      <line x1="160" y1="160" x2="160" y2="72" stroke="#4fd6e0" stroke-width="1.1"></line>
      <line x1="160" y1="160" x2="201" y2="75" stroke="#4fd6e0" stroke-width="0.9"></line>
      <line x1="160" y1="160" x2="237" y2="95" stroke="#4fd6e0" stroke-width="1.0"></line>
      <line x1="160" y1="160" x2="260" y2="128" stroke="#4fd6e0" stroke-width="0.9"></line>
      <line x1="160" y1="160" x2="268" y2="166" stroke="#4fd6e0" stroke-width="1.1"></line>
      <line x1="160" y1="160" x2="257" y2="205" stroke="#4fd6e0" stroke-width="0.9"></line>
      <line x1="160" y1="160" x2="234" y2="237" stroke="#4fd6e0" stroke-width="1.0"></line>
      <line x1="160" y1="160" x2="199" y2="256" stroke="#4fd6e0" stroke-width="0.85"></line>
      <line x1="160" y1="160" x2="160" y2="262" stroke="#4fd6e0" stroke-width="1.0"></line>
      <line x1="160" y1="160" x2="120" y2="256" stroke="#4fd6e0" stroke-width="0.9"></line>
      <line x1="160" y1="160" x2="85" y2="237" stroke="#4fd6e0" stroke-width="1.0"></line>
      <line x1="160" y1="160" x2="63" y2="205" stroke="#4fd6e0" stroke-width="0.85"></line>
      <line x1="160" y1="160" x2="52" y2="166" stroke="#4fd6e0" stroke-width="1.1"></line>
      <line x1="160" y1="160" x2="62" y2="128" stroke="#4fd6e0" stroke-width="0.9"></line>
      <line x1="160" y1="160" x2="84" y2="94" stroke="#4fd6e0" stroke-width="1.0"></line>
      <line x1="160" y1="160" x2="120" y2="75" stroke="#4fd6e0" stroke-width="0.9"></line>
    </g>
    <g id="spokes-secondary" opacity="0.45" style="transition:opacity 0.7s ease">
      <line x1="160" y1="160" x2="180" y2="71" stroke="#4fd6e0" stroke-width="0.55"></line>
      <line x1="160" y1="160" x2="220" y2="84" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="252" y2="110" stroke="#4fd6e0" stroke-width="0.55"></line>
      <line x1="160" y1="160" x2="267" y2="147" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="264" y2="186" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="246" y2="221" stroke="#4fd6e0" stroke-width="0.55"></line>
      <line x1="160" y1="160" x2="218" y2="248" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="180" y2="261" stroke="#4fd6e0" stroke-width="0.45"></line>
      <line x1="160" y1="160" x2="140" y2="261" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="101" y2="248" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="73" y2="222" stroke="#4fd6e0" stroke-width="0.55"></line>
      <line x1="160" y1="160" x2="55" y2="187" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="52" y2="147" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="67" y2="110" stroke="#4fd6e0" stroke-width="0.55"></line>
      <line x1="160" y1="160" x2="100" y2="83" stroke="#4fd6e0" stroke-width="0.5"></line>
      <line x1="160" y1="160" x2="140" y2="70" stroke="#4fd6e0" stroke-width="0.55"></line>
    </g>
    <g id="crypts" opacity="0.0" stroke="#4fd6e0" fill="none" style="transition:opacity 0.9s ease">
      <path d="M218,108 Q230,140 218,172" stroke-width="0.7"></path>
      <path d="M172,92  Q150,88  130,100" stroke-width="0.65"></path>
      <path d="M103,108 Q92,138  102,170" stroke-width="0.7"></path>
      <path d="M102,172 Q114,200 136,216" stroke-width="0.65"></path>
      <path d="M186,216 Q206,200 218,172" stroke-width="0.65"></path>
      <path d="M196,130 Q204,160 195,190" stroke-width="0.55"></path>
      <path d="M165,115 Q145,112 128,126" stroke-width="0.5"></path>
      <path d="M126,130 Q118,158 127,188" stroke-width="0.55"></path>
      <path d="M128,190 Q140,208 160,213" stroke-width="0.5"></path>
      <path d="M160,213 Q180,208 195,190" stroke-width="0.5"></path>
    </g>
  </g>

  <circle id="collarette-ring" cx="160" cy="160" r="52" fill="none" stroke="#4fd6e0" stroke-width="1.0" stroke-dasharray="2.8 3.6" opacity="0.0" clip-path="url(#cp-iris)" style="transition:opacity 0.8s ease, stroke 0.7s ease"></circle>
  <g id="collarette-notches" opacity="0.0" clip-path="url(#cp-iris)" style="transition:opacity 0.8s ease">
    <line x1="160" y1="108" x2="160" y2="114" stroke="#4fd6e0" stroke-width="0.8"></line>
    <line x1="196" y1="116" x2="193" y2="122" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="214" y1="148" x2="208" y2="150" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="205" y1="187" x2="200" y2="183" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="176" y1="209" x2="173" y2="203" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="144" y1="209" x2="147" y2="203" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="115" y1="187" x2="120" y2="183" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="106" y1="148" x2="112" y2="150" stroke="#4fd6e0" stroke-width="0.7"></line>
    <line x1="124" y1="116" x2="127" y2="122" stroke="#4fd6e0" stroke-width="0.7"></line>
  </g>

  <circle cx="160" cy="160" r="90" fill="url(#grd-sheen)" clip-path="url(#cp-iris)" opacity="0.7"></circle>

  <g clip-path="url(#cp-iris)">
    <g id="sweep-group" style="transform-origin:160px 160px; animation:sweep-rot 5s linear infinite">
      <path id="sweep-wedge" d="M160,160 L160,70 A90,90 0 0,1 195,73 Z" fill="url(#grd-sweep)" opacity="0.7"></path>
      <line id="sweep-line" x1="160" y1="160" x2="160" y2="70" stroke="#4fd6e0" stroke-width="0.8" opacity="0.6"></line>
    </g>
  </g>

  <circle id="limbal-ring" cx="160" cy="160" r="90" fill="none" stroke="#4fd6e0" stroke-width="2.8" opacity="0.55" filter="url(#f-limbal)" style="animation:limbal-pulse 2.4s ease-in-out infinite; --lp-lo:0.45; --lp-hi:0.85; transition:stroke 0.7s ease, stroke-width 0.7s ease"></circle>

  <circle id="pupil-glow" cx="160" cy="160" r="33" fill="url(#grd-pupil)" filter="url(#f-pupil-glow)" style="transition:r 0.8s ease"></circle>
  <circle id="pupil-void" cx="160" cy="160" r="26" fill="#000" style="transition:r 0.8s ease"></circle>
  <circle id="pupil-edge" cx="160" cy="160" r="26" fill="none" stroke="#4fd6e0" stroke-width="0.7" opacity="0.0" style="transition:r 0.8s ease, opacity 0.8s ease, stroke 0.7s ease"></circle>

  <ellipse id="glint-main" cx="146" cy="147" rx="7" ry="4.5" fill="white" opacity="0.22" transform="rotate(-18,146,147)"></ellipse>
  <ellipse id="glint-small" cx="170" cy="151" rx="2.8" ry="1.8" fill="white" opacity="0.12" transform="rotate(8,170,151)"></ellipse>
</svg>
<div class="eye-floats" id="floats">
  <span class="f1">λ 488nm</span><span class="f2">θ 0.04</span><span class="f3">∮ stable</span><span class="f4">Δ +1</span>
</div>
`;

export default function EyesPage() {
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
            <div className="eye" id="eye" dangerouslySetInnerHTML={{ __html: EYE_HTML }} />
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
