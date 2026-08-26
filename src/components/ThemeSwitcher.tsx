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
import { safeGetValue, safeSet } from '@/lib/safeStorage';

export type SiteTheme = SiteThemeId;

/** Embedded editors that render their own chrome the site switcher must not overlay. */
const EDITOR_ROUTES = ['/studio', '/keystatic'];

export function ThemeSwitcher() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<SiteThemeId>('grimoire');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Guarded read. An unguarded `localStorage.getItem` throws outright in a
    // storage-blocked browser, and because the throw happened before
    // `setMounted(true)` the `if (!mounted) return null` below then removed the
    // theme control from the page permanently — a lost preference became a
    // missing UI element.
    const initial = normalizeStoredTheme(safeGetValue(THEME_STORAGE_KEY));
    setTheme(initial);
    applyThemeToDocument(initial);
    setMounted(true);
  }, []);

  function select(next: SiteThemeId) {
    setTheme(next);
    // Apply BEFORE persisting. The previous order wrote first, so a throwing
    // store discarded the theme the reader had just chosen — the visible change
    // was lost along with the saved one, when only the saved one had failed.
    // A theme is machine-derived preference, so a failed write degrades to
    // session-only in silence; reader-authored data does not get that treatment.
    applyThemeToDocument(next);
    safeSet(THEME_STORAGE_KEY, next);
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
