'use client';

import { useEffect } from 'react';

/**
 * Progressive enhancement for /map: cross-highlight legend ↔ thread on hover,
 * click-to-focus a single thread, keyboard navigation, and mobile legend toggle.
 */
export function MapClient() {
  useEffect(() => {
    const stage = document.querySelector('.realm-map__stage');
    const mapKey = document.querySelector('.map-key');
    const toggle = document.querySelector<HTMLButtonElement>('.map-key__toggle');

    const threads = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>('.ley[data-key]').forEach((g) => {
      threads.set(g.dataset.key as string, g);
    });
    const items = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>('.ley-legend__item[data-key]').forEach((li) => {
      items.set(li.dataset.key as string, li);
    });

    const keys = [...threads.keys()];
    let focusedKey: string | null = null;

    const link = (key: string, on: boolean) => {
      threads.get(key)?.classList.toggle('lit', on);
      items.get(key)?.classList.toggle('lit', on);
    };

    const applyFocus = (key: string | null) => {
      focusedKey = key;
      const hasFocus = key !== null;
      stage?.classList.toggle('map--has-focus', hasFocus);
      threads.forEach((g, k) => {
        g.classList.toggle('focused', k === key);
        g.classList.toggle('dimmed', hasFocus && k !== key);
      });
      items.forEach((li, k) => {
        li.classList.toggle('focused', k === key);
        li.setAttribute('aria-selected', k === key ? 'true' : 'false');
      });
    };

    const toggleFocus = (key: string) => {
      applyFocus(focusedKey === key ? null : key);
    };

    const cleanups: Array<() => void> = [];

    threads.forEach((g, key) => {
      const enter = () => {
        if (!focusedKey) link(key, true);
      };
      const leave = () => {
        if (!focusedKey) link(key, false);
      };
      const click = (e: Event) => {
        e.preventDefault();
        toggleFocus(key);
      };
      const keydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFocus(key);
        }
      };
      g.addEventListener('mouseenter', enter);
      g.addEventListener('mouseleave', leave);
      g.addEventListener('click', click);
      g.addEventListener('keydown', keydown);
      cleanups.push(() => {
        g.removeEventListener('mouseenter', enter);
        g.removeEventListener('mouseleave', leave);
        g.removeEventListener('click', click);
        g.removeEventListener('keydown', keydown);
      });
    });

    items.forEach((li, key) => {
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-selected', 'false');

      const enter = () => {
        if (!focusedKey) link(key, true);
      };
      const leave = () => {
        if (!focusedKey) link(key, false);
      };
      const click = () => toggleFocus(key);
      const keydown = (e: KeyboardEvent) => {
        const idx = keys.indexOf(key);
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFocus(key);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const next = keys[(idx + 1) % keys.length];
          items.get(next)?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = keys[(idx - 1 + keys.length) % keys.length];
          items.get(prev)?.focus();
        } else if (e.key === 'Escape') {
          applyFocus(null);
        }
      };
      li.addEventListener('mouseenter', enter);
      li.addEventListener('mouseleave', leave);
      li.addEventListener('click', click);
      li.addEventListener('keydown', keydown);
      cleanups.push(() => {
        li.removeEventListener('mouseenter', enter);
        li.removeEventListener('mouseleave', leave);
        li.removeEventListener('click', click);
        li.removeEventListener('keydown', keydown);
      });
    });

    const onDocClick = (e: MouseEvent) => {
      if (!focusedKey) return;
      const t = e.target as Node;
      if (
        ![...threads.values()].some((g) => g.contains(t)) &&
        ![...items.values()].some((li) => li.contains(t))
      ) {
        applyFocus(null);
      }
    };
    document.addEventListener('click', onDocClick);
    cleanups.push(() => document.removeEventListener('click', onDocClick));

    if (toggle && mapKey) {
      const onToggle = () => mapKey.classList.toggle('is-collapsed');
      toggle.addEventListener('click', onToggle);
      cleanups.push(() => toggle.removeEventListener('click', onToggle));

      const mq = window.matchMedia('(max-width: 640px)');
      const syncCollapse = () => {
        if (mq.matches) mapKey.classList.add('is-collapsed');
        else mapKey.classList.remove('is-collapsed');
      };
      syncCollapse();
      mq.addEventListener('change', syncCollapse);
      cleanups.push(() => mq.removeEventListener('change', syncCollapse));
    }

    return () => cleanups.forEach((c) => c());
  }, []);

  return null;
}
