import type { LeyLine } from '@/data/realm-map';
import { MAP_CENTER, MAP_RING } from '@/data/realm-map';

export interface LeyNode {
  ley: LeyLine;
  key: string;
  x: number;
  y: number;
  d: string;
  anchor: 'start' | 'middle' | 'end';
  lx: number;
  ly: number;
}

export function computeLeyNodes(leyLines: LeyLine[]): LeyNode[] {
  const C = MAP_CENTER;
  return leyLines.map((ley, i) => {
    const a = -Math.PI / 2 + (i / leyLines.length) * Math.PI * 2;
    const x = C.x + Math.cos(a) * MAP_RING.rx;
    const y = C.y + Math.sin(a) * MAP_RING.ry;
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
}

export function codexHref(href?: string) {
  return href ? `/codex/${href}` : undefined;
}
