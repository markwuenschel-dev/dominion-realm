/**
 * The Realm, as a cartographer would draw it (content-depth backlog #4 — the Map).
 *
 * Single source of truth for the procedural SVG on /map. The page computes ALL
 * geometry from this data, so the map redraws itself when you edit the lore
 * here — no SVG surgery required.
 *
 * Canon (src/content/places/eriadne.md): Eriadne accreted over the convergence
 * of the EIGHT elemental ley lines; beneath the ruins on its outskirts lies a
 * dormant natural portal at their knot; the Xyloryn invade at that ruins-portal,
 * and the N'hal denature reality wherever they pass ("the interface goes dark").
 * Eriadne is "the city of threads," Marcus "the man who sees threads" — so the
 * eight lines are named as threads.
 *
 * AUTHORING PLACES ON THE MAP:
 *   Add mapX and mapY (0–100) to a place's codex frontmatter — MapMarkers
 *   overlays it automatically. Optional mapKind: city | ruin | frontier | landmark.
 *
 * THREAD NAMES: the eight elements and their threads are canon (Fire→Ember,
 * Water→Tide, Earth→Strata, Wind→Gale, Light→Dawn, Shadow→Umbral, Life→Verdant,
 * Death→Hollow). `provisional` drives the cartouche "Provisional" badge; false
 * now that the names are settled. Glosses are editable flavour, not hard canon.
 */

export interface LeyLine {
  element: string;
  name: string;
  hue: string;
  gloss: string;
  href?: string;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapMarker {
  name: string;
  kind: string;
  gloss: string;
  href?: string;
  color?: string;
}

export interface WashEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ThreatMarker extends MapMarker {
  id: string;
  labelAnchor: MapPoint;
  subLabel: string;
  wash: WashEllipse;
  particles: MapPoint[];
  cssClass: 'threat--nhal' | 'threat--xyloryn';
}

export interface RuinsMarker extends MapMarker {
  x: number;
  y: number;
}

export interface Region {
  id: string;
  label: string;
  pathD: string;
  gloss?: string;
}

export interface Route {
  id: string;
  label: string;
  pathD: string;
  gloss?: string;
}

export interface RealmMap {
  provisional: boolean;
  hub: MapMarker;
  ruins: RuinsMarker;
  threats: ThreatMarker[];
  leyLines: LeyLine[];
  regions?: Region[];
  routes?: Route[];
}

export const realmMap: RealmMap = {
  provisional: false,
  hub: {
    name: 'Eriadne',
    kind: 'The Thread City',
    gloss:
      'Where the eight ley lines knot. No ruler but reputation; power here is relationship and consequence.',
    href: 'places/eriadne',
    color: 'var(--gold)',
  },
  ruins: {
    name: 'The Ruins',
    kind: 'The crossing',
    gloss:
      "Ancient structures on the city-fringe; beneath them, a dormant natural portal at the knot of the threads — the walkers' way in.",
    href: 'places/eriadne',
    x: 372,
    y: 446,
    color: '#9b6cf0',
  },
  threats: [
    {
      id: 'nhal',
      name: "The N'hal",
      kind: 'Threat-frontier',
      gloss:
        'Ontological predators. Where they pass, names detach, places stop being locatable, and the interface goes dark.',
      href: 'factions/the-nhal',
      color: '#6f6a86',
      cssClass: 'threat--nhal',
      labelAnchor: { x: 64, y: 92 },
      subLabel: 'the interface goes dark',
      wash: { cx: 132, cy: 120, rx: 270, ry: 226 },
      particles: [
        { x: 96, y: 96 },
        { x: 150, y: 78 },
        { x: 78, y: 150 },
        { x: 132, y: 132 },
        { x: 188, y: 108 },
        { x: 108, y: 188 },
      ],
    },
    {
      id: 'xyloryn',
      name: 'The Xyloryn',
      kind: 'Threat-frontier',
      gloss:
        'A biological, adapting swarm. It learns what kills it and stops dying; to fight it twice the same way is to lose.',
      href: 'factions/the-xyloryn',
      color: '#8fb45e',
      cssClass: 'threat--xyloryn',
      labelAnchor: { x: 896, y: 650 },
      subLabel: 'the adapting swarm',
      wash: { cx: 836, cy: 600, rx: 272, ry: 218 },
      particles: [
        { x: 786, y: 552 },
        { x: 858, y: 588 },
        { x: 812, y: 624 },
        { x: 880, y: 540 },
        { x: 840, y: 660 },
        { x: 762, y: 600 },
        { x: 902, y: 612 },
      ],
    },
  ],
  regions: [
    {
      id: 'northern-reach',
      label: 'The Northern Reach',
      gloss: "Where the Tidethread and Stormthread run cold before the N'hal frontier.",
      pathD:
        'M 48,180 Q 120,140 200,160 T 380,200 Q 420,220 400,280 T 320,340 Q 200,360 120,320 T 48,260 Z',
    },
    {
      id: 'southern-basin',
      label: 'The Southern Basin',
      gloss: 'Lowlands where the Greenthread and Forgethread pool before the swarm coast.',
      pathD:
        'M 560,520 Q 680,480 820,520 T 920,620 Q 880,700 760,680 T 560,620 Q 520,580 560,520 Z',
    },
    {
      id: 'inner-sea',
      label: 'The Inner Sea',
      gloss: "Brackish water ringed by Eriadne's outer wards — the city's first mirror.",
      pathD:
        'M 300,300 Q 400,260 520,300 T 640,380 Q 600,460 480,480 T 300,420 Q 260,360 300,300 Z',
    },
  ],
  routes: [
    {
      id: 'ward-road',
      label: 'The Ward Road',
      gloss: 'Pilgrim way from the ruins-portal to the thread shrines on the outer ring.',
      pathD: 'M 372,446 Q 420,400 480,370 T 580,340',
    },
    {
      id: 'tide-path',
      label: 'The Tide Path',
      gloss: 'Merchant track following the Tidethread toward the northern wharves.',
      pathD: 'M 480,114 Q 400,100 300,140 T 180,200',
    },
  ],
  leyLines: [
    {
      element: 'Fire',
      name: 'Ember Thread',
      hue: '#ef7a5e',
      gloss: 'Fire and will — the thread that asks the highest price.',
    },
    {
      element: 'Water',
      name: 'Tide Thread',
      hue: '#4fd6e0',
      gloss: 'Water and depth — what the current carries under.',
    },
    {
      element: 'Earth',
      name: 'Strata Thread',
      hue: '#c69a5a',
      gloss: 'Stone and strata — the weight that holds a world up.',
    },
    {
      element: 'Wind',
      name: 'Gale Thread',
      hue: '#7fb0e0',
      gloss: 'Air and storm — the held breath before the strike.',
    },
    {
      element: 'Light',
      name: 'Dawn Thread',
      hue: '#f0d878',
      gloss: 'Light and revelation — what the dawn makes plain.',
    },
    {
      element: 'Shadow',
      name: 'Umbral Thread',
      hue: '#9b6cf0',
      gloss: 'Shadow and secrets — the cost of unseeing.',
    },
    {
      element: 'Life',
      name: 'Verdant Thread',
      hue: '#46c6a0',
      gloss: 'Growth and rot — the slow patience of living things.',
    },
    {
      element: 'Death',
      name: 'Hollow Thread',
      hue: '#7a7690',
      gloss: 'Endings and the hollow after — what the Realm lets go.',
    },
  ],
};

export const MAP_VIEWBOX = { w: 960, h: 720 } as const;
export const MAP_CENTER = { x: 480, y: 360 } as const;
export const MAP_RING = { rx: 332, ry: 246 } as const;
