// ─────────────────────────────────────────────────────────────────────────────
// lib/map-geometry.test.ts
// computeLeyNodes is pure, deterministic trig that the /map SVG draws straight
// from — ring placement, alternating bow direction, and anchor-band thresholds.
// A silent change here is a silent visual map regression, so this pins the
// non-obvious geometry: cardinal placement, the quadratic path string, the
// three anchor bands, and the label offsets.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { computeLeyNodes, codexHref } from './map-geometry';
import { realmMap, MAP_CENTER, MAP_RING } from '@/data/realm-map';
import type { LeyLine } from '@/data/realm-map';

const ley = (element: string, href?: string): LeyLine => ({
  element,
  name: element,
  hue: '#000',
  gloss: '',
  href,
});

// Four lines land at the ring's cardinal points, where the geometry is exact:
// i0 top (a = -90°), i1 right (0°), i2 bottom (90°), i3 left (180°).
const four = [ley('Tide'), ley('Verdance'), ley('Tempest'), ley('Aether')];

describe('computeLeyNodes', () => {
  it('returns one node per ley line, keyed by lowercased element, preserving the source', () => {
    const nodes = computeLeyNodes(four);
    expect(nodes).toHaveLength(4);
    expect(nodes.map((n) => n.key)).toEqual(['tide', 'verdance', 'tempest', 'aether']);
    expect(nodes[0].ley).toBe(four[0]);
  });

  it('places the first node at the top of the ring and bows its path to centre', () => {
    const [top] = computeLeyNodes(four);
    expect(top.x).toBeCloseTo(MAP_CENTER.x); // 480
    expect(top.y).toBeCloseTo(MAP_CENTER.y - MAP_RING.ry); // 114
    // Quadratic from the node, control point pulled left by the bow, to the centre.
    expect(top.d).toBe('M480.0,114.0 Q456.0,237.0 480,360');
  });

  it('emits a 1-dp quadratic path from every node to the centre', () => {
    for (const n of computeLeyNodes(four)) {
      expect(n.d).toMatch(/^M-?\d+\.\d,-?\d+\.\d Q-?\d+\.\d,-?\d+\.\d 480,360$/);
    }
  });

  it('classifies the anchor band by horizontal position (cosA vs ±0.34)', () => {
    const [top, right, bottom, left] = computeLeyNodes(four);
    expect(top.anchor).toBe('middle'); // cosA ≈ 0
    expect(right.anchor).toBe('start'); // cosA = 1
    expect(bottom.anchor).toBe('middle'); // cosA ≈ 0
    expect(left.anchor).toBe('end'); // cosA = -1
  });

  it('offsets the label outward per anchor and vertically per hemisphere', () => {
    const [top, right, bottom, left] = computeLeyNodes(four);
    // start/end push the label out ±14; middle keeps it on the node.
    expect(right.lx).toBeCloseTo(right.x + 14);
    expect(left.lx).toBeCloseTo(left.x - 14);
    expect(top.lx).toBeCloseTo(top.x);
    // side nodes nudge down 5; the upper node lifts 16; the lower node drops 25.
    expect(right.ly).toBeCloseTo(right.y + 5);
    expect(top.ly).toBeCloseTo(top.y - 16);
    expect(bottom.ly).toBeCloseTo(bottom.y + 25);
  });

  it('covers the real eight ley lines with the expected anchor pattern', () => {
    // Guards the live map: adding/removing a thread changes this on purpose.
    const nodes = computeLeyNodes(realmMap.leyLines);
    expect(nodes).toHaveLength(8);
    expect(nodes.map((n) => n.anchor)).toEqual([
      'middle',
      'start',
      'start',
      'start',
      'middle',
      'end',
      'end',
      'end',
    ]);
  });
});

describe('codexHref', () => {
  it('prefixes a codex path, or passes through undefined', () => {
    expect(codexHref('places/eriadne')).toBe('/codex/places/eriadne');
    expect(codexHref()).toBeUndefined();
    expect(codexHref('')).toBeUndefined();
  });
});
