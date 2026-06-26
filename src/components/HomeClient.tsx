'use client';

import { useEffect } from 'react';

/**
 * Homepage interactivity ported from index.astro's inline script: mobile-menu
 * toggle, scroll-driven reveal/power-rail/scrollspy, and the Kit signup with a
 * native-submit fallback. Runs once on mount against the server-rendered DOM
 * (queried by id/class, exactly like the original). Renders nothing.
 */
export function HomeClient() {
  useEffect(() => {
    // Prevent browser scroll-restoration from landing mid-page on the homepage.
    window.scrollTo(0, 0);

    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const onHamburger = () => document.body.classList.toggle('menu-open');
    hamburger?.addEventListener('click', onHamburger);
    const menuLinks = mobileMenu ? [...mobileMenu.querySelectorAll('a')] : [];
    const closeMenu = () => document.body.classList.remove('menu-open');
    menuLinks.forEach((a) => a.addEventListener('click', closeMenu));

    const reveals = [...document.querySelectorAll<HTMLElement>('.reveal')];
    const stages = [...document.querySelectorAll<HTMLElement>('.stage')];
    const sections = [...document.querySelectorAll<HTMLElement>('section[id], footer[id]')];
    const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('#sideNav a')];

    let ticking = false;
    function onScroll() {
      const vh = window.innerHeight;
      for (let i = 0; i < reveals.length; i++) {
        const el = reveals[i];
        if (el.classList.contains('in')) continue;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) el.classList.add('in');
      }
      stages.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top < vh * 0.7 && r.bottom > vh * 0.2) s.classList.add('lit');
      });
      const mid = vh * 0.42;
      let activeId = sections[0] ? sections[0].id : null;
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= mid) activeId = sec.id;
      }
      if (activeId) {
        navLinks.forEach((l) =>
          l.classList.toggle('active', l.getAttribute('href') === '#' + activeId),
        );
      }
      ticking = false;
    }
    function requestScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }
    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);

    function armReveals() {
      reveals.forEach((el, i) => {
        el.style.transitionDelay = Math.min(i % 4, 3) * 0.07 + 's';
        el.classList.add('armed');
      });
      onScroll();
    }
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;opacity:0;pointer-events:none;transition:opacity .15s linear';
    document.body.appendChild(probe);
    requestAnimationFrame(() => {
      probe.style.opacity = '1';
    });
    const probeTimer = window.setTimeout(() => {
      const advancing = parseFloat(getComputedStyle(probe).opacity) > 0.05;
      probe.remove();
      if (advancing && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        armReveals();
      }
      onScroll();
    }, 260);

    onScroll();
    window.addEventListener('load', onScroll);

    const form = document.getElementById('signupForm') as HTMLFormElement | null;
    const note = document.getElementById('signupNote');
    const onSubmit = async (e: Event) => {
      e.preventDefault();
      if (!form || !note) return;
      const action = form.getAttribute('action');
      if (!action) {
        note.textContent = 'You are on the list. Welcome, walker.';
        note.style.color = 'var(--gold-bright)';
        form.reset();
        return;
      }
      note.textContent = 'Joining the Realmwalkers…';
      note.style.color = 'var(--ink-dim)';
      try {
        const res = await fetch(action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams(new FormData(form) as unknown as Record<string, string>),
        });
        if (!res.ok) throw new Error('Signup failed: ' + res.status);
        note.textContent = 'You are on the list. Welcome, walker.';
        note.style.color = 'var(--gold-bright)';
        form.reset();
      } catch {
        note.textContent = 'Confirming your signup…';
        form.submit();
      }
    };
    form?.addEventListener('submit', onSubmit);

    return () => {
      hamburger?.removeEventListener('click', onHamburger);
      menuLinks.forEach((a) => a.removeEventListener('click', closeMenu));
      window.removeEventListener('scroll', requestScroll);
      window.removeEventListener('resize', requestScroll);
      window.removeEventListener('load', onScroll);
      window.clearTimeout(probeTimer);
      form?.removeEventListener('submit', onSubmit);
    };
  }, []);

  return null;
}
