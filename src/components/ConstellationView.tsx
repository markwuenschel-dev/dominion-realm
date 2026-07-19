'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { isRevealed, sealedLabel, type RevealTier } from '@/lib/reveal';
import { useReveal } from '@/components/reveal/RevealContext';

/**
 * The constellation SVG + "in words" index, gated client-side (ADR-0004). The
 * page computes the geometry on the server (it needs the server-only content
 * loader) and hands this component a lean, serializable model; here we read the
 * reader's level and ANONYMIZE every above-tier node — its name is replaced by
 * "Sealed · {Tier}", its link and tooltip dropped — and strip relationship labels
 * on any edge touching a sealed node. So the whole-codex map never spells out a
 * spoiler entry's name or ties at a lower level. Node `data-id` / edge
 * `data-a`/`data-b` are preserved so `ConstellationClient` hover still works.
 */

export interface ConstNode {
  id: string;
  name: string;
  collection: string;
  color: string;
  x: number;
  y: number;
  r: number;
  isHub: boolean;
  reveal: RevealTier;
  href: string;
  label: {
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    baseline: 'auto' | 'middle' | 'hanging';
  };
}

export interface ConstEdge {
  key: string;
  a: string;
  b: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  labels: string[];
  fallback: string;
  reveal: RevealTier;
}

export interface ConstConn {
  key: string;
  name: string;
  collection: string;
  href: string;
  labels: string[];
  reveal: RevealTier;
}

export interface ConstThread {
  id: string;
  name: string;
  collection: string;
  color: string;
  href: string;
  reveal: RevealTier;
  conns: ConstConn[];
}

export function ConstellationView({
  nodes,
  edges,
  threads,
}: {
  nodes: ConstNode[];
  edges: ConstEdge[];
  threads: ConstThread[];
}) {
  const { level } = useReveal();
  const seen = (tier: RevealTier) => isRevealed(tier, level);

  return (
    <>
      <div className="constellation-wrap">
        <svg
          className="constellation"
          viewBox="0 0 1000 1000"
          role="img"
          aria-label="Relationship map of The Dominion Realm's codex entries"
        >
          <g className="edges">
            {edges.map((e) => {
              const open = seen(e.reveal);
              return (
                <line
                  key={e.key}
                  className="edge"
                  data-a={e.a}
                  data-b={e.b}
                  x1={e.ax}
                  y1={e.ay}
                  x2={e.bx}
                  y2={e.by}
                >
                  <title>{open ? e.labels.join(' · ') || e.fallback : 'Sealed connection'}</title>
                </line>
              );
            })}
          </g>
          <g className="nodes">
            {nodes.map((n) => {
              const open = seen(n.reveal);
              const style = { ['--c']: open ? n.color : 'var(--line)' } as CSSProperties;
              const label = open ? n.name : sealedLabel(n.reveal);
              const common = (
                <>
                  <title>{open ? `${n.name} · ${n.collection}` : sealedLabel(n.reveal)}</title>
                  <circle className="node-dot" cx={n.x} cy={n.y} r={n.r} />
                  <text
                    className="node-label"
                    x={n.label.x}
                    y={n.label.y}
                    textAnchor={n.label.anchor}
                    dominantBaseline={n.label.baseline}
                  >
                    {label}
                  </text>
                </>
              );
              // Revealed nodes link to the codex; sealed ones are inert <g> so no
              // href/name reaches the DOM. Both keep data-id for hover adjacency.
              return open ? (
                <a
                  key={n.id}
                  className={`node${n.isHub ? ' node--hub' : ''}`}
                  href={n.href}
                  data-id={n.id}
                  tabIndex={-1}
                  style={style}
                >
                  {common}
                </a>
              ) : (
                <g key={n.id} className="node node--sealed" data-id={n.id} style={style}>
                  {common}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <section className="rel-index" aria-label="Relationships in words">
        <h2 className="rel-index__title">Every thread, in words</h2>
        <div className="rel-index__grid">
          {threads.map((t) => {
            const open = seen(t.reveal);
            return (
              <div className="rel-row" key={t.id}>
                {open ? (
                  <Link
                    className="rel-row__name"
                    href={t.href}
                    style={{ ['--c']: t.color } as CSSProperties}
                  >
                    {t.name}
                  </Link>
                ) : (
                  <span className="rel-row__name rel-row__name--sealed">
                    {sealedLabel(t.reveal)}
                  </span>
                )}
                <span className="rel-row__kind">{t.collection}</span>
                <div className="rel-row__conns">
                  {t.conns.map((c) =>
                    seen(c.reveal) ? (
                      <Link className="rel-chip" href={c.href} key={c.key}>
                        {c.labels.length > 0 && (
                          <span className="rel-chip__rel">{c.labels.join(' · ')}</span>
                        )}
                        {c.name}
                      </Link>
                    ) : (
                      <span className="rel-chip rel-chip--sealed" key={c.key}>
                        {sealedLabel(c.reveal)}
                      </span>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
