'use client';

import { useEffect } from 'react';

/**
 * Progressive enhancement for /map: cross-highlight legend ↔ thread on hover.
 * The map is fully usable without this (threads also self-light via CSS :hover).
 * Ported from map.astro's inline script. Renders nothing.
 */
export function MapClient() {
  useEffect(() => {
    const threads = new Map<string, Element>();
    document
      .querySelectorAll<HTMLElement>('.ley[data-key]')
      .forEach((g) => threads.set(g.dataset.key as string, g));
    const items = new Map<string, Element>();
    document
      .querySelectorAll<HTMLElement>('.ley-legend__item[data-key]')
      .forEach((li) => items.set(li.dataset.key as string, li));

    const link = (key: string, on: boolean) => {
      threads.get(key)?.classList.toggle('lit', on);
      items.get(key)?.classList.toggle('lit', on);
    };

    const cleanups: Array<() => void> = [];
    threads.forEach((g, key) => {
      const enter = () => link(key, true);
      const leave = () => link(key, false);
      g.addEventListener('mouseenter', enter);
      g.addEventListener('mouseleave', leave);
      cleanups.push(() => {
        g.removeEventListener('mouseenter', enter);
        g.removeEventListener('mouseleave', leave);
      });
    });
    items.forEach((li, key) => {
      const enter = () => link(key, true);
      const leave = () => link(key, false);
      li.addEventListener('mouseenter', enter);
      li.addEventListener('mouseleave', leave);
      cleanups.push(() => {
        li.removeEventListener('mouseenter', enter);
        li.removeEventListener('mouseleave', leave);
      });
    });

    return () => cleanups.forEach((c) => c());
  }, []);

  return null;
}
