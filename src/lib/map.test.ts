import { describe, it, expect } from 'vitest';
import {
  clampPercent,
  hasCoords,
  selectVisibleMarkers,
  type PlaceMarker,
  type SealedMarker,
} from './map';

/**
 * Pure map logic (content-depth backlog #4). These tests pin the two things the
 * interactive map's spoiler-safety depends on: coordinates stay inside the
 * figure, and markers above the reader's reveal tier are stripped of their name
 * before they can reach the DOM.
 */

const marker = (over: Partial<PlaceMarker> = {}): PlaceMarker => ({
  id: 'eriadne',
  name: 'Eriadne',
  kind: 'Ley-line convergence',
  summary: 'The Thread City.',
  href: '/codex/places/eriadne',
  reveal: 'teaser',
  x: 50,
  y: 50,
  ...over,
});

describe('clampPercent', () => {
  it('passes through in-range values', () => {
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(42.5)).toBe(42.5);
    expect(clampPercent(100)).toBe(100);
  });

  it('clamps out-of-range values to the figure bounds', () => {
    expect(clampPercent(-30)).toBe(0);
    expect(clampPercent(140)).toBe(100);
  });

  it('treats non-finite input as 0', () => {
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent(Infinity)).toBe(0);
    expect(clampPercent(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('hasCoords', () => {
  it('is true only when both coordinates are finite numbers', () => {
    expect(hasCoords({ x: 10, y: 20 })).toBe(true);
    expect(hasCoords({ x: 0, y: 0 })).toBe(true);
    expect(hasCoords({ x: 10 })).toBe(false);
    expect(hasCoords({ x: undefined, y: 20 })).toBe(false);
    expect(hasCoords({ x: null, y: null })).toBe(false);
    expect(hasCoords({ x: NaN, y: 5 })).toBe(false);
  });
});

describe('selectVisibleMarkers', () => {
  it('reveals teaser markers at every level', () => {
    const [m] = selectVisibleMarkers([marker()], 'teaser');
    expect(m.status).toBe('revealed');
    expect(m).toMatchObject({ name: 'Eriadne', href: '/codex/places/eriadne' });
  });

  it('seals markers whose tier is above the reader level, dropping the name', () => {
    const [m] = selectVisibleMarkers(
      [marker({ id: 'x', name: 'The Shadow Keep', reveal: 'deep' })],
      'teaser',
    );
    expect(m.status).toBe('sealed');
    const sealed = m as SealedMarker;
    expect(sealed.label).toBe('Sealed · Deep');
    expect(sealed.reveal).toBe('deep');
    // The crux of spoiler-safety: no name, kind, summary, or href leak through.
    expect(JSON.stringify(sealed)).not.toContain('Shadow Keep');
    expect('name' in sealed).toBe(false);
    expect('href' in sealed).toBe(false);
  });

  it('un-seals a marker once the reader level reaches its tier', () => {
    const markers = [marker({ id: 'k', name: 'The Shadow Keep', reveal: 'deep' })];
    expect(selectVisibleMarkers(markers, 'reader')[0].status).toBe('sealed');
    const deep = selectVisibleMarkers(markers, 'deep')[0];
    expect(deep.status).toBe('revealed');
    expect(deep).toMatchObject({ name: 'The Shadow Keep' });
  });

  it('clamps marker coordinates into the figure', () => {
    const [m] = selectVisibleMarkers([marker({ x: -10, y: 250 })], 'teaser');
    expect(m.x).toBe(0);
    expect(m.y).toBe(100);
  });

  it('preserves input order and one result per marker', () => {
    const out = selectVisibleMarkers(
      [marker({ id: 'a' }), marker({ id: 'b', reveal: 'beyond' }), marker({ id: 'c' })],
      'teaser',
    );
    expect(out.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(out.map((m) => m.status)).toEqual(['revealed', 'sealed', 'revealed']);
  });
});
