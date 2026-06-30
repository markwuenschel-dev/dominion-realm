import type { CSSProperties } from 'react';
import {
  realmMap,
  MAP_VIEWBOX,
  MAP_CENTER,
  MAP_RING,
} from '@/data/realm-map';
import { computeLeyNodes, codexHref } from '@/lib/map-geometry';

const { hub, ruins, threats, regions = [], routes = [], leyLines, provisional } = realmMap;
const nodes = computeLeyNodes(leyLines);
const C = MAP_CENTER;
const VB = MAP_VIEWBOX;

export function RealmMapSvg() {
  return (
    <svg
      className="realm-map__svg"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      role="img"
      aria-labelledby="realmMapTitle realmMapDesc"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="realmMapTitle">A map of the Realm</title>
      <desc id="realmMapDesc">
        Eriadne sits at the center, where eight elemental ley threads converge; the ruins-portal
        lies on its outskirts, with the N&apos;hal frontier to the northwest and the Xyloryn swarm
        to the southeast.
      </desc>

      <defs>
        <radialGradient id="rm-bg" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="var(--map-bg-center)" />
          <stop offset="55%" stopColor="var(--map-bg-mid)" />
          <stop offset="100%" stopColor="var(--map-bg-edge)" />
        </radialGradient>
        <radialGradient id="rm-hub-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--map-hub-glow)" stopOpacity="0.5" />
          <stop offset="55%" stopColor="var(--map-hub-glow)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--map-hub-glow)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rm-portal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--map-portal)" stopOpacity="0.32" />
          <stop offset="65%" stopColor="var(--map-portal-mid)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--map-portal)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rm-nhal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--map-nhal-core)" stopOpacity="0.66" />
          <stop offset="52%" stopColor="var(--map-nhal-mid)" stopOpacity="0.32" />
          <stop offset="78%" stopColor="var(--map-nhal-edge)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--map-nhal-edge)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rm-xyloryn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--map-xyl-core)" stopOpacity="0.2" />
          <stop offset="55%" stopColor="var(--map-xyl-mid)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--map-xyl-mid)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={VB.w} height={VB.h} fill="url(#rm-bg)" />

      {regions.length > 0 && (
        <g className="rm-regions" aria-hidden="true">
          {regions.map((r) => (
            <path key={r.id} className="rm-region" data-region={r.id} d={r.pathD} />
          ))}
        </g>
      )}

      {routes.length > 0 && (
        <g className="rm-routes" aria-hidden="true">
          {routes.map((r) => (
            <path key={r.id} className="rm-route" data-route={r.id} d={r.pathD} />
          ))}
        </g>
      )}

      <g className="rm-washes" aria-hidden="true">
        <ellipse
          cx={threats[0].wash.cx}
          cy={threats[0].wash.cy}
          rx={threats[0].wash.rx}
          ry={threats[0].wash.ry}
          fill="url(#rm-nhal)"
        />
        <ellipse
          cx={threats[1].wash.cx}
          cy={threats[1].wash.cy}
          rx={threats[1].wash.rx}
          ry={threats[1].wash.ry}
          fill="url(#rm-xyloryn)"
        />
        {threats[0].particles.map((p, i) => (
          <line
            key={`d${i}`}
            className="rm-denature"
            x1={p.x - 5}
            y1={p.y - 5}
            x2={p.x + 5}
            y2={p.y + 5}
          />
        ))}
        {threats[1].particles.map((p, i) => (
          <circle key={`s${i}`} className="rm-swarm" cx={p.x} cy={p.y} r="1.8" />
        ))}
      </g>

      <g className="rm-graticule" aria-hidden="true">
        <ellipse cx={C.x} cy={C.y} rx={MAP_RING.rx} ry={MAP_RING.ry} />
        <ellipse cx={C.x} cy={C.y} rx={MAP_RING.rx * 0.66} ry={MAP_RING.ry * 0.66} />
        <ellipse cx={C.x} cy={C.y} rx={MAP_RING.rx * 0.34} ry={MAP_RING.ry * 0.34} />
      </g>

      {nodes.map((n, i) => (
        <g
          key={n.key}
          className="ley"
          data-key={n.key}
          tabIndex={0}
          role="button"
          aria-label={`${n.ley.element} — ${n.ley.name}`}
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
        className="rm-mark hub-mark"
        href={codexHref(hub.href)}
        aria-label={`${hub.name} — ${hub.kind} (open in codex)`}
      >
        <rect
          className="rm-mark__bg"
          x={C.x - 52}
          y={C.y + 18}
          width="104"
          height="34"
          rx="4"
        />
        <text className="hub-name" x={C.x} y={C.y + 34} textAnchor="middle">
          {hub.name}
        </text>
        <text className="hub-kicker" x={C.x} y={C.y + 46} textAnchor="middle">
          {hub.kind.toUpperCase()}
        </text>
      </a>

      <a
        className="rm-mark ruin"
        href={codexHref(ruins.href)}
        aria-label={`${ruins.name} — ${ruins.kind} (open in codex)`}
      >
        <line
          className="ruin-tether"
          x1={ruins.x}
          y1={ruins.y}
          x2={C.x}
          y2={C.y}
        />
        <circle className="ruin-portal" cx={ruins.x} cy={ruins.y} r="9" />
        <circle className="ruin-ring" cx={ruins.x} cy={ruins.y} r="14" />
        <text className="ruin-name" x={ruins.x} y={ruins.y + 32} textAnchor="middle">
          {ruins.name}
        </text>
        <text className="ruin-kicker" x={ruins.x} y={ruins.y + 44} textAnchor="middle">
          {ruins.kind.toUpperCase()}
        </text>
      </a>

      {threats.map((threat) => {
        const href = codexHref(threat.href);
        const anchor = threat.labelAnchor.x > VB.w / 2 ? 'end' : 'start';
        return (
          <a
            key={threat.id}
            className={`rm-mark threat ${threat.cssClass}`}
            href={href}
            aria-label={`${threat.name} — ${threat.kind} (open in codex)`}
          >
            <text
              className="threat-name"
              x={threat.labelAnchor.x}
              y={threat.labelAnchor.y}
              textAnchor={anchor}
            >
              {threat.name}
            </text>
            <text
              className="threat-sub"
              x={threat.labelAnchor.x}
              y={threat.labelAnchor.y + 14}
              textAnchor={anchor}
            >
              {threat.subLabel}
            </text>
          </a>
        );
      })}

      <g className="rm-frame" aria-hidden="true">
        <rect x="12" y="12" width="936" height="696" rx="6" />
        <path d="M22,42 V22 H42" />
        <path d="M918,22 H938 V42" />
        <path d="M938,678 V698 H918" />
        <path d="M42,698 H22 V678" />
        <g className="rm-scale" transform="translate(48,680)">
          <line x1="0" y1="0" x2="60" y2="0" className="rm-scale__bar" />
          <text className="rm-scale__lbl" x="30" y="12" textAnchor="middle">
            50 leagues
          </text>
        </g>
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
          {provisional ? ' — PROVISIONAL' : ''}
        </text>
      </g>
    </svg>
  );
}
