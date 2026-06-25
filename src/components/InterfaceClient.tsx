'use client';

import { useEffect } from 'react';

/**
 * /interface behavior ported from interface.astro's inline script: the ARIA
 * tabs pattern (roving tabindex + arrow keys) and the stat-bar fill that arms
 * once the animation clock is confirmed advancing. Operates on the
 * server-rendered sheet markup by class. Renders nothing.
 */
export function InterfaceClient() {
  useEffect(() => {
    const tablist = document.querySelector('.sheet-tabs');
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('.sheet-tab')];
    const panels = [...document.querySelectorAll<HTMLElement>('.sheet-panel')];

    function select(name: string | undefined, moveFocus?: boolean) {
      for (const t of tabs) {
        const on = t.dataset.tab === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (on && moveFocus) t.focus();
      }
      for (const p of panels) p.classList.toggle('is-active', p.dataset.panel === name);
    }

    const clickHandlers = tabs.map((t) => {
      const h = () => select(t.dataset.tab);
      t.addEventListener('click', h);
      return h;
    });

    const onKey = (e: KeyboardEvent) => {
      const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      let next = cur;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        next = (cur - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      select(tabs[next].dataset.tab, true);
    };
    tablist?.addEventListener('keydown', onKey as EventListener);

    const sheet = document.querySelector('.sheet');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf1 = 0;
    let raf2 = 0;
    if (!reduce) {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => sheet?.classList.add('armed'));
      });
    } else {
      sheet?.classList.add('armed');
    }

    return () => {
      tabs.forEach((t, i) => t.removeEventListener('click', clickHandlers[i]));
      tablist?.removeEventListener('keydown', onKey as EventListener);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return null;
}
