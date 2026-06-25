import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import '@/styles/relationships.css';
import {
  getCodexEntries,
  matchRelationship,
  codexUrl,
  COLLECTION_LABELS,
  COLLECTION_ORDER,
  type CodexEntry,
} from '@/lib/codex';
import { CodexChrome } from '@/components/CodexChrome';
import { ConstellationClient } from '@/components/ConstellationClient';

export const metadata: Metadata = {
  title: 'The Constellation',
  description:
    'A relationship map of The Dominion Realm — how the cast, the powers, the factions, and the places of the Realm pull on one another.',
};

const COLLECTION_COLOR: Record<string, string> = {
  characters: '#e3c486',
  concepts: '#4fd6e0',
  factions: '#ef6f9e',
  places: '#9b6cf0',
};
const CENTER = 500;
const R = 350;

interface Edge {
  a: string;
  b: string;
  labels: string[];
}
interface Point {
  x: number;
  y: number;
  onRing: boolean;
}
interface SvgLabel {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'auto' | 'middle' | 'hanging';
}

function build() {
  const all = getCodexEntries();
  const byId = new Map(all.map((e) => [e.id, e]));

  const edgeMap = new Map<string, Edge>();
  for (const e of all) {
    for (const rel of e.data.relationships) {
      const target = matchRelationship(rel, all);
      if (!target || target.id === e.id) continue;
      const [a, b] = [e.id, target.id].sort();
      const key = `${a}|${b}`;
      const existing = edgeMap.get(key);
      if (existing) {
        if (rel.label && !existing.labels.includes(rel.label)) existing.labels.push(rel.label);
      } else {
        edgeMap.set(key, { a, b, labels: rel.label ? [rel.label] : [] });
      }
    }
  }
  const edges = [...edgeMap.values()];

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.a, (degree.get(e.a) ?? 0) + 1);
    degree.set(e.b, (degree.get(e.b) ?? 0) + 1);
  }
  const nodeEntries = all.filter((e) => degree.has(e.id));
  const hub = nodeEntries.reduce(
    (best, n) => ((degree.get(n.id) ?? 0) > (degree.get(best.id) ?? 0) ? n : best),
    nodeEntries[0],
  );

  const collIndex = (e: CodexEntry) => COLLECTION_ORDER.indexOf(e.collection);
  const ring = nodeEntries
    .filter((n) => n.id !== hub.id)
    .sort((a, b) => collIndex(a) - collIndex(b) || a.data.name.localeCompare(b.data.name));

  const pos = new Map<string, Point>();
  pos.set(hub.id, { x: CENTER, y: CENTER, onRing: false });
  ring.forEach((n, i) => {
    const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(n.id, {
      x: CENTER + Math.cos(angle) * R,
      y: CENTER + Math.sin(angle) * R,
      onRing: true,
    });
  });

  const threadIndex = nodeEntries
    .map((n) => ({
      node: n,
      conns: edges
        .filter((e) => e.a === n.id || e.b === n.id)
        .map((e) => ({ entry: byId.get(e.a === n.id ? e.b : e.a)!, labels: e.labels }))
        .sort((x, y) => x.entry.data.name.localeCompare(y.entry.data.name)),
    }))
    .sort(
      (a, b) =>
        collIndex(a.node) - collIndex(b.node) || a.node.data.name.localeCompare(b.node.data.name),
    );

  const legend = COLLECTION_ORDER.filter((c) => nodeEntries.some((n) => n.collection === c));

  return { byId, edges, degree, nodeEntries, hub, pos, threadIndex, legend };
}

const nodeRadius = (degree: Map<string, number>, id: string) =>
  Math.min(30, 9 + (degree.get(id) ?? 1) * 1.8);

function labelFor(p: Point, r: number): SvgLabel {
  if (!p.onRing) return { x: p.x, y: p.y + r + 26, anchor: 'middle', baseline: 'hanging' };
  const dx = p.x - CENTER;
  if (Math.abs(dx) < 70) {
    const below = p.y >= CENTER;
    return {
      x: p.x,
      y: p.y + (below ? r + 22 : -(r + 14)),
      anchor: 'middle',
      baseline: below ? 'hanging' : 'auto',
    };
  }
  const right = dx > 0;
  return {
    x: p.x + (right ? r + 9 : -(r + 9)),
    y: p.y,
    anchor: right ? 'start' : 'end',
    baseline: 'middle',
  };
}

export default function RelationshipsPage() {
  const { byId, edges, degree, nodeEntries, hub, pos, threadIndex, legend } = build();

  return (
    <CodexChrome>
      <div className="codex-head">
        <span className="codex-head__label">The Constellation</span>
        <h1 className="codex-head__title">
          Every thread, <em>at once</em>
        </h1>
        <p className="codex-head__intro">
          One substrate, many interfaces — and many ties. This is the whole codex drawn as a single
          figure: each point is an entry, each line a relationship it declares. Hover a point to
          light its threads, or follow one to its page.
        </p>
        <div className="codex-rule" />
      </div>

      <div className="rel-legend">
        {legend.map((c) => (
          <span className="rel-legend__item" key={c}>
            <span
              className="rel-legend__dot"
              style={{ ['--c']: COLLECTION_COLOR[c] } as CSSProperties}
            />
            {COLLECTION_LABELS[c]}
          </span>
        ))}
      </div>

      <div className="constellation-wrap">
        <svg
          className="constellation"
          viewBox="0 0 1000 1000"
          role="img"
          aria-label="Relationship map of The Dominion Realm's codex entries"
        >
          <g className="edges">
            {edges.map((e) => {
              const a = pos.get(e.a)!;
              const b = pos.get(e.b)!;
              return (
                <line
                  key={`${e.a}|${e.b}`}
                  className="edge"
                  data-a={e.a}
                  data-b={e.b}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                >
                  <title>
                    {e.labels.join(' · ') ||
                      `${byId.get(e.a)!.data.name} — ${byId.get(e.b)!.data.name}`}
                  </title>
                </line>
              );
            })}
          </g>
          <g className="nodes">
            {nodeEntries.map((n) => {
              const p = pos.get(n.id)!;
              const r = nodeRadius(degree, n.id);
              const lab = labelFor(p, r);
              return (
                <a
                  key={n.id}
                  className={`node${n.id === hub.id ? ' node--hub' : ''}`}
                  href={codexUrl(n.collection, n.id)}
                  data-id={n.id}
                  tabIndex={-1}
                  style={{ ['--c']: COLLECTION_COLOR[n.collection] } as CSSProperties}
                >
                  <title>
                    {n.data.name} · {COLLECTION_LABELS[n.collection]}
                  </title>
                  <circle className="node-dot" cx={p.x} cy={p.y} r={r} />
                  <text
                    className="node-label"
                    x={lab.x}
                    y={lab.y}
                    textAnchor={lab.anchor}
                    dominantBaseline={lab.baseline}
                  >
                    {n.data.name}
                  </text>
                </a>
              );
            })}
          </g>
        </svg>
      </div>

      <section className="rel-index" aria-label="Relationships in words">
        <h2 className="rel-index__title">Every thread, in words</h2>
        <div className="rel-index__grid">
          {threadIndex.map(({ node, conns }) => (
            <div className="rel-row" key={node.id}>
              <Link
                className="rel-row__name"
                href={codexUrl(node.collection, node.id)}
                style={{ ['--c']: COLLECTION_COLOR[node.collection] } as CSSProperties}
              >
                {node.data.name}
              </Link>
              <span className="rel-row__kind">{COLLECTION_LABELS[node.collection]}</span>
              <div className="rel-row__conns">
                {conns.map((c, i) => (
                  <Link
                    className="rel-chip"
                    href={codexUrl(c.entry.collection, c.entry.id)}
                    key={`${c.entry.id}-${i}`}
                  >
                    {c.labels.length > 0 && (
                      <span className="rel-chip__rel">{c.labels.join(' · ')}</span>
                    )}
                    {c.entry.data.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link className="codex-back" href="/codex">
        ← All entries
      </Link>
      <ConstellationClient />
    </CodexChrome>
  );
}
