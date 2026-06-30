export type ThemeMode = 'dark' | 'light';

export interface SiteThemeDef {
  /** localStorage / data-theme value. Omit attribute on <html> for default. */
  id: string;
  label: string;
  mode: ThemeMode;
  /** Grimoire default — no data-theme attribute on <html>. */
  isDefault?: boolean;
}

export const SITE_THEMES: SiteThemeDef[] = [
  { id: 'grimoire', label: 'Grimoire', mode: 'dark', isDefault: true },
  { id: 'parchment', label: 'Parchment', mode: 'light' },
  { id: 'slate', label: 'Slate', mode: 'light' },
  { id: 'solstice', label: 'Solstice', mode: 'light' },
];

/** Legacy localStorage values → canonical id */
export const THEME_ALIASES: Record<string, string> = { dark: 'grimoire' };

export const THEME_STORAGE_KEY = 'dr-theme';

const DEFAULT_THEME = SITE_THEMES.find((t) => t.isDefault) ?? SITE_THEMES[0];

export type SiteThemeId = (typeof SITE_THEMES)[number]['id'];

export function getThemeById(id: string | null | undefined): SiteThemeDef {
  const normalized = id ? (THEME_ALIASES[id] ?? id) : DEFAULT_THEME.id;
  return SITE_THEMES.find((t) => t.id === normalized) ?? DEFAULT_THEME;
}

export function normalizeStoredTheme(raw: string | null): SiteThemeId {
  if (!raw) return DEFAULT_THEME.id as SiteThemeId;
  const id = THEME_ALIASES[raw] ?? raw;
  return SITE_THEMES.some((t) => t.id === id) ? (id as SiteThemeId) : (DEFAULT_THEME.id as SiteThemeId);
}

export function applyThemeToDocument(id: SiteThemeId) {
  const theme = getThemeById(id);
  if (theme.isDefault) {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme.id;
  }
  document.documentElement.dataset.themeMode = theme.mode;
}
