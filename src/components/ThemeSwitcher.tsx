'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  SITE_THEMES,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  normalizeStoredTheme,
  type SiteThemeId,
} from '@/data/site-themes';

export type SiteTheme = SiteThemeId;

/** Embedded editors that render their own chrome the site switcher must not overlay. */
const EDITOR_ROUTES = ['/studio', '/keystatic'];

export function ThemeSwitcher() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<SiteThemeId>('grimoire');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = normalizeStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
    setTheme(initial);
    applyThemeToDocument(initial);
    setMounted(true);
  }, []);

  function select(next: SiteThemeId) {
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyThemeToDocument(next);
  }

  if (!mounted) return null;
  // Don't overlay the embedded editors (Sanity Studio / Keystatic) — the
  // fixed switcher sits on top of their own toolbars (e.g. Sanity's Publish).
  if (EDITOR_ROUTES.some((route) => pathname?.startsWith(route))) return null;

  return (
    <div className="theme-switcher-wrap">
      <span className="theme-switcher-label">Theme</span>
      <select
        value={theme}
        onChange={(e) => select(e.target.value as SiteThemeId)}
        className="theme-switcher-select"
        aria-label="Site theme"
      >
        {SITE_THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
