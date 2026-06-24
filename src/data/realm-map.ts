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
 * The hues reuse the Neurochromatic Eyes' cyan→amber "spectral DNA" (tokens.css
 * --spectral and the STAGES palette in /eyes), so the map and the Eyes read as
 * the same world.
 *
 * PROVISIONAL: the eight element/thread NAMES are an evocative placeholder set,
 * consistent with established lore (elemental ley lines + the Thread City).
 * Rename freely from the manuscript — the order and hues can stay as-is.
 * `provisional` documents intent; it drives nothing visual.
 */

export interface LeyLine {
  /** Element the thread carries, e.g. "Tide". Short — this is the on-map label. */
  element: string;
  /** The thread's proper name for the legend, e.g. "The Tidethread". */
  name: string;
  /** Hex hue from the Eyes' spectral ramp. */
  hue: string;
  /** One-line gloss for the legend. */
  gloss: string;
  /** Optional codex link as `${collection}/${id}` once a ley-lines entry exists. */
  href?: string;
}

export interface MapMarker {
  name: string;
  /** Short type/role label, e.g. "The Thread City", "Threat-frontier". */
  kind: string;
  gloss: string;
  /** Optional codex link target as `${collection}/${id}` (the page prepends BASE_URL). */
  href?: string;
}

export interface RealmMap {
  /** True while any name is a placeholder pending the manuscript (see file header). */
  provisional: boolean;
  /** The convergence at the center of the map. */
  hub: MapMarker;
  /** The ancient ruins + dormant portal on Eriadne's outskirts. */
  ruins: MapMarker;
  /** The two ending-frontiers, drawn as washes at opposite edges. */
  threats: MapMarker[];
  /** Exactly eight, drawn radially in order (top, then clockwise). */
  leyLines: LeyLine[];
}

export const realmMap: RealmMap = {
  provisional: true,
  hub: {
    name: 'Eriadne',
    kind: 'The Thread City',
    gloss:
      'Where the eight ley lines knot. No ruler but reputation; power here is relationship and consequence.',
    href: 'places/eriadne',
  },
  ruins: {
    name: 'The Ruins',
    kind: 'The crossing',
    gloss:
      "Ancient structures on the city-fringe; beneath them, a dormant natural portal at the knot of the threads — the walkers' way in.",
    href: 'places/eriadne',
  },
  threats: [
    {
      name: "The N'hal",
      kind: 'Threat-frontier',
      gloss:
        'Ontological predators. Where they pass, names detach, places stop being locatable, and the interface goes dark.',
      href: 'factions/the-nhal',
    },
    {
      name: 'The Xyloryn',
      kind: 'Threat-frontier',
      gloss:
        'A biological, adapting swarm. It learns what kills it and stops dying; to fight it twice the same way is to lose.',
      href: 'factions/the-xyloryn',
    },
  ],
  // Eight threads, top then clockwise. Hue order walks the Eyes' spectral ramp
  // (cyan → teal → azure → indigo → violet → orchid → rose → amber).
  leyLines: [
    {
      element: 'Tide',
      name: 'The Tidethread',
      hue: '#4fd6e0',
      gloss: 'Water, depth, and what the current carries under.',
    },
    {
      element: 'Verdance',
      name: 'The Greenthread',
      hue: '#46c6a0',
      gloss: 'Growth and rot — the slow patience of living things.',
    },
    {
      element: 'Tempest',
      name: 'The Stormthread',
      hue: '#5b8def',
      gloss: 'Air and lightning; the held breath before the strike.',
    },
    {
      element: 'Aether',
      name: 'The Aetherthread',
      hue: '#8a7bf0',
      gloss: 'Mind and the arcane — the thread Marcus reads best.',
    },
    {
      element: 'Umbra',
      name: 'The Umbral Thread',
      hue: '#9b6cf0',
      gloss: 'Shadow, secrets, and the cost of unseeing.',
    },
    {
      element: 'Spirit',
      name: 'The Soulthread',
      hue: '#c86fce',
      gloss: 'Echo and self — what the Realm remembers of you.',
    },
    {
      element: 'Ember',
      name: 'The Emberthread',
      hue: '#ef6f9e',
      gloss: 'Fire and will; the thread that asks the highest price.',
    },
    {
      element: 'Forge',
      name: 'The Forgethread',
      hue: '#e0a850',
      gloss: 'Stone and making — the weight that holds a city up.',
    },
  ],
};
