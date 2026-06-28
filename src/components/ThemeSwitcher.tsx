'use client';

import { useEffect, useState } from 'react';

export type SiteTheme = 'dark' | 'parchment';

const THEMES: { key: SiteTheme; label: string }[] = [
  { key: 'dark', label: 'Dark' },
  { key: 'parchment', label: 'Parchment' },
];

const STORAGE_KEY = 'dr-theme';

function applyTheme(theme: SiteTheme) {
  if (theme === 'dark') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<SiteTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SiteTheme | null;
    const initial = stored && THEMES.some((t) => t.key === stored) ? stored : 'dark';
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function select(next: SiteTheme) {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  if (!mounted) return null;

  return (
    <div className="theme-switcher-wrap">
      <span className="theme-switcher-label">Theme</span>
      <select
        value={theme}
        onChange={(e) => select(e.target.value as SiteTheme)}
        className="theme-switcher-select"
        aria-label="Site theme"
      >
        {THEMES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
