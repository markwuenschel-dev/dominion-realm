import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import '@/styles/reading.css';
import '@/styles/map.css';
import { realmMap, type LeyLine } from '@/data/realm-map';
import { getPlaceMarkers } from '@/lib/codex';
import { ReadingChrome } from '@/components/reading/ReadingChrome';
import { MapClient } from '@/components/MapClient';
import { MapMarkers } from '@/components/MapMarkers';

export const metadata: Metadata = {
  title: 'The Map',
  description:
    'A map of the Realm — Eriadne at the convergence of the eight elemental ley lines, the ruins-portal at its edge, and the frontiers the threats come from.',
};

const { hub, ruins, threats, leyLines } = realmMap;
const codex = (href?: string) => (href ? `/codex/${href}` : undefined);

const VB = { w: 960, h: 720 };
const C = { x: 480, y: 360 };
const RING = { rx: 332, ry: 246 };

interface Node {
  ley: LeyLine;
  key: string;
  x: number;
  y: number;
  d: string;
  anchor: 'start' | 'middle' | 'end';
  lx: number;
  ly: number;
}

const nodes: Node[] = leyLines.map((ley, i) => {
  const a = -Math.PI / 2 + (i / leyLines.length) * Math.PI * 2;
  const x = C.x + Math.cos(a) * RING.rx;
  const y = C.y + Math.sin(a) * RING.ry;
  const mx = (x + C.x) / 2;
  const my = (y + C.y) / 2;
  const dx = C.x - x;
  const dy = C.y - y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = 24 * (i % 2 === 0 ? 1 : -1);
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  const d = `M${x.toFixed(1)},${y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${C.x},${C.y}`;
  const cosA = Math.cos(a);
  const anchor = cosA > 0.34 ? 'start' : cosA < -0.34 ? 'end' : 'middle';
  const lx = x + (anchor === 'start' ? 14 : anchor === 'end' ? -14 : 0);
  const ly = Math.abs(cosA) <= 0.34 ? (Math.sin(a) < 0 ? y - 16 : y + 25) : y + 5;
  return { ley, key: ley.element.toLowerCase(), x, y, d, anchor, lx, ly };
});

const landmarks = [
  { ...hub, color: 'var(--gold)' },
  { ...ruins, color: '#9b6cf0' },
  { ...threats[0], color: '#6f6a86' },
  { ...threats[1], color: '#8fb45e' },
];

const swarm = [
  [786, 552],
  [858, 588],
  [812, 624],
  [880, 540],
  [840, 660],
  [762, 600],
  [902, 612],
];
const denature = [
  [96, 96],
  [150, 78],
  [78, 150],
  [132, 132],
  [188, 108],
  [108, 188],
];

export default function MapPage() {
  const placeMarkers = getPlaceMarkers();
  return (
    <ReadingChrome>
      <div className="map-page">
        <header className="map-head">
          <span className="reading-article__kicker">Cartography of the Realm</span>
          <h1 className="reading-article__title">
            The <em>Map</em>
          </h1>
          <p className="reading-article__summary">
            Eriadne at the convergence of the eight ley lines — and what spreads out from it.
          </p>
          <div className="reading-article__rule" />
        </header>

        <figure className="realm-map">
          <div className="realm-map__stage">
            <svg
              className="realm-map__svg"
              viewBox={`0 0 ${VB.w} ${VB.h}`}
              role="img"
              aria-labelledby="realmMapTitle realmMapDesc"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title id="realmMapTitle">A map of the Realm</title>
              <desc id="realmMapDesc">
                Eriadne sits at the center, where eight elemental ley threads converge; the
                ruins-portal lies on its outskirts, with the N&apos;hal frontier to the northwest
                and the Xyloryn swarm to the southeast.
              </desc>

              <defs>
                <radialGradient id="rm-bg" cx="50%" cy="50%" r="72%">
                  <stop offset="0%" stopColor="#161a2b" />
                  <stop offset="55%" stopColor="#0d0f1a" />
                  <stop offset="100%" stopColor="#080910" />
                </radialGradient>
                <radialGradient id="rm-hub-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c8a86a" stopOpacity="0.5" />
                  <stop offset="55%" stopColor="#c8a86a" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#c8a86a" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="rm-portal" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#9b6cf0" stopOpacity="0.32" />
                  <stop offset="65%" stopColor="#5b8def" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#9b6cf0" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="rm-nhal" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#04050a" stopOpacity="0.66" />
                  <stop offset="52%" stopColor="#090a16" stopOpacity="0.32" />
                  <stop offset="78%" stopColor="#3a3a5e" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#3a3a5e" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="rm-xyloryn" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#5a7233" stopOpacity="0.2" />
                  <stop offset="55%" stopColor="#3f4f26" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#3f4f26" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect x="0" y="0" width={VB.w} height={VB.h} fill="url(#rm-bg)" />

              <g className="rm-washes" aria-hidden="true">
                <ellipse cx="132" cy="120" rx="270" ry="226" fill="url(#rm-nhal)" />
                <ellipse cx="836" cy="600" rx="272" ry="218" fill="url(#rm-xyloryn)" />
                {denature.map(([x, y], i) => (
                  <line
                    key={`d${i}`}
                    className="rm-denature"
                    x1={x - 5}
                    y1={y - 5}
                    x2={x + 5}
                    y2={y + 5}
                  />
                ))}
                {swarm.map(([x, y], i) => (
                  <circle key={`s${i}`} className="rm-swarm" cx={x} cy={y} r="1.8" />
                ))}
              </g>

              <g className="rm-graticule" aria-hidden="true">
                <ellipse cx={C.x} cy={C.y} rx={RING.rx} ry={RING.ry} />
                <ellipse cx={C.x} cy={C.y} rx={RING.rx * 0.66} ry={RING.ry * 0.66} />
                <ellipse cx={C.x} cy={C.y} rx={RING.rx * 0.34} ry={RING.ry * 0.34} />
              </g>

              {nodes.map((n, i) => (
                <g
                  key={n.key}
                  className="ley"
                  data-key={n.key}
                  style={{ ['--hue']: n.ley.hue, ['--i']: i } as CSSProperties}
                >
                  <path className="ley-base" d={n.d} />
                  <path className="ley-flow" d={n.d} />
                  <circle className="ley-node-ring" cx={n.x} cy={n.y} r="6" />
                  <circle className="ley-node-dot" cx={n.x} cy={n.y} r="2.6" />
                  <text className="ley-label" x={n.lx} y={n.ly} textAnchor={n.anchor}>
                    {n.ley.element}
                  </text>
                </g>
              ))}

              <g className="hub" aria-hidden="true">
                <circle cx={C.x} cy={C.y} r="58" fill="url(#rm-hub-glow)" />
                <circle cx={C.x} cy={C.y} r="22" fill="url(#rm-portal)" />
                <circle
                  className="hub-ring hub-ring--spin"
                  cx={C.x}
                  cy={C.y}
                  r="34"
                  style={{ transformOrigin: `${C.x}px ${C.y}px` }}
                />
                <circle className="hub-ring" cx={C.x} cy={C.y} r="22" />
                <circle className="hub-ring hub-ring--inner" cx={C.x} cy={C.y} r="12" />
                <circle className="hub-core" cx={C.x} cy={C.y} r="5.5" />
              </g>
              <a
                className="rm-mark ruin"
                href={codex(ruins.href)}
                aria-label={`The Ruins — ${ruins.kind} (open in codex)`}
              >
                <line className="ruin-tether" x1="372" y1="446" x2={C.x} y2={C.y} />
                <circle className="ruin-portal" cx="372" cy="446" r="9" />
                <circle className="ruin-ring" cx="372" cy="446" r="14" />
                <text className="ruin-name" x="372" y="478" textAnchor="middle">
                  The Ruins
                </text>
                <text className="ruin-kicker" x="372" y="490" textAnchor="middle">
                  THE CROSSING
                </text>
              </a>

              <a
                className="rm-mark threat threat--nhal"
                href={codex(threats[0].href)}
                aria-label={`${threats[0].name} — ${threats[0].kind} (open in codex)`}
              >
                <text className="threat-name" x="64" y="92" textAnchor="start">
                  The N&apos;hal
                </text>
                <text className="threat-sub" x="64" y="106" textAnchor="start">
                  the interface goes dark
                </text>
              </a>
              <a
                className="rm-mark threat threat--xyloryn"
                href={codex(threats[1].href)}
                aria-label={`${threats[1].name} — ${threats[1].kind} (open in codex)`}
              >
                <text className="threat-name" x="896" y="650" textAnchor="end">
                  The Xyloryn
                </text>
                <text className="threat-sub" x="896" y="664" textAnchor="end">
                  the adapting swarm
                </text>
              </a>

              <g className="rm-frame" aria-hidden="true">
                <rect x="12" y="12" width="936" height="696" rx="6" />
                <path d="M22,42 V22 H42" />
                <path d="M918,22 H938 V42" />
                <path d="M938,678 V698 H918" />
                <path d="M42,698 H22 V678" />
                <g className="rm-compass" transform="translate(892,84)">
                  <circle r="16" />
                  <path className="rm-compass__n" d="M0,-12 L4,0 L0,5 L-4,0 Z" />
                  <path className="rm-compass__s" d="M0,12 L4,0 L0,-5 L-4,0 Z" />
                  <text className="rm-compass__lbl" x="0" y="-21" textAnchor="middle">
                    N
                  </text>
                </g>
                <text className="rm-cartouche" x="30" y="694">
                  THE DOMINION REALM — A CARTOGRAPHY OF THE EIGHT THREADS
                </text>
              </g>
            </svg>
            <MapMarkers markers={placeMarkers} />
          </div>

          <figcaption className="realm-map__cap">
            A cartographer&apos;s rendering — the eight threads as Eriadne&apos;s scholars name
            them. Hover a thread to trace it home; select a marked place to open its codex entry.
          </figcaption>
        </figure>

        <section className="map-key" aria-label="Map legend">
          <h2 className="map-key__title">The Eight Threads</h2>
          <ul className="ley-legend">
            {nodes.map((n) => (
              <li
                key={n.key}
                className="ley-legend__item"
                data-key={n.key}
                style={{ ['--hue']: n.ley.hue } as CSSProperties}
              >
                <span className="ley-legend__swatch" aria-hidden="true" />
                <div>
                  <span className="ley-legend__el">{n.ley.element}</span>
                  <span className="ley-legend__name">{n.ley.name}</span>
                  <p className="ley-legend__gloss">{n.ley.gloss}</p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="map-key__title">Landmarks &amp; Frontiers</h2>
          <ul className="land-legend">
            {landmarks.map((m, i) => {
              const href = codex(m.href);
              return (
                <li
                  key={`${m.name}-${i}`}
                  className="land-legend__item"
                  style={{ ['--swatch']: m.color } as CSSProperties}
                >
                  <span className="land-legend__swatch" aria-hidden="true" />
                  <div>
                    <span className="land-legend__name">
                      {href ? <Link href={href}>{m.name}</Link> : m.name}
                    </span>
                    <span className="land-legend__kind">{m.kind}</span>
                    <p className="land-legend__gloss">{m.gloss}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <Link className="reading-back" href="/">
          ← Back to The Dominion Realm
        </Link>
      </div>
      <MapClient />
    </ReadingChrome>
  );
}
