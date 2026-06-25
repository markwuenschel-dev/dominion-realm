'use client';

import { useEffect } from 'react';

/**
 * Hover/focus highlighting for the /relationships constellation: lights a node's
 * adjacent edges + neighbors and dims the rest. Ported from relationships.astro's
 * inline script (adjacency read from each edge's data-a/data-b). Renders nothing;
 * the SVG is fully usable without it.
 */
export function ConstellationClient() {
  useEffect(() => {
    const svg = document.querySelector('.constellation');
    if (!svg) return;
    const nodes = [...svg.querySelectorAll<SVGElement>('.node')];
    const edges = [...svg.querySelectorAll<SVGElement>('.edge')];

    const adj = new Map<string, Set<string>>();
    for (const ed of edges) {
      const a = ed.getAttribute('data-a');
      const b = ed.getAttribute('data-b');
      if (!a || !b) continue;
      (adj.get(a) ?? adj.set(a, new Set()).get(a))!.add(b);
      (adj.get(b) ?? adj.set(b, new Set()).get(b))!.add(a);
    }

    function focus(id: string | null) {
      if (!id || !svg) return;
      const neighbors = adj.get(id) ?? new Set<string>();
      svg.classList.add('focused');
      for (const n of nodes) {
        const nid = n.getAttribute('data-id');
        const active = nid === id;
        const neighbor = !!nid && neighbors.has(nid);
        n.classList.toggle('is-active', active);
        n.classList.toggle('is-neighbor', neighbor);
        n.classList.toggle('is-dim', !active && !neighbor);
      }
      for (const ed of edges) {
        ed.classList.toggle(
          'is-lit',
          ed.getAttribute('data-a') === id || ed.getAttribute('data-b') === id,
        );
      }
    }
    function clear() {
      if (!svg) return;
      svg.classList.remove('focused');
      for (const n of nodes) n.classList.remove('is-active', 'is-neighbor', 'is-dim');
      for (const ed of edges) ed.classList.remove('is-lit');
    }

    const cleanups: Array<() => void> = [];
    for (const n of nodes) {
      const id = n.getAttribute('data-id');
      const enter = () => focus(id);
      n.addEventListener('mouseenter', enter);
      n.addEventListener('mouseleave', clear);
      n.addEventListener('focus', enter);
      n.addEventListener('blur', clear);
      cleanups.push(() => {
        n.removeEventListener('mouseenter', enter);
        n.removeEventListener('mouseleave', clear);
        n.removeEventListener('focus', enter);
        n.removeEventListener('blur', clear);
      });
    }
    return () => cleanups.forEach((c) => c());
  }, []);

  return null;
}
