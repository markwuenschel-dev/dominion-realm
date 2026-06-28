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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SiteTheme | null;
    if (stored && THEMES.some((t) => t.key === stored)) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  function select(next: SiteTheme) {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <div className="flex items-center gap-0.5" aria-label="Site theme">
      {THEMES.map((t) => (
        <button
          key={t.key}
          onClick={() => select(t.key)}
          aria-pressed={theme === t.key}
          className={[
            'rounded px-2 py-1 text-[10px] uppercase tracking-widest transition-colors',
            theme === t.key
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
