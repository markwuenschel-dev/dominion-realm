import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import netlify from '@astrojs/netlify';

// GitHub Actions sets GITHUB_ACTIONS=true automatically, so the Pages build
// serves under the project base path. Netlify and local builds serve from root.
const onGitHubPages = process.env.GITHUB_ACTIONS === 'true';

// Keystatic's admin UI and its /api/keystatic/* OAuth routes need a server, so
// they only ship on the Netlify (SSR) deploy — never on GitHub Pages, which is
// pure static (ADR-0009, amends ADR-0001). Reuse the same Pages flag: when on
// Pages we omit React + Keystatic + the adapter entirely, keeping that build
// 100% static. Local dev and the Netlify build get the full CMS.
const cmsIntegrations = onGitHubPages ? [] : [react(), keystatic()];
const cmsAdapter = onGitHubPages ? undefined : netlify();

export default defineConfig({
  integrations: cmsIntegrations,
  ...(cmsAdapter ? { adapter: cmsAdapter } : {}),

  // Static everywhere by default; only the Keystatic admin + its API routes opt
  // into on-demand rendering (via `export const prerender = false`), so the
  // public site stays prerendered on both targets.
  output: 'static',

  site: onGitHubPages
    ? 'https://markwuenschel-dev.github.io'
    : 'https://dominion-realm.netlify.app', // ← change to your real Netlify URL
  // Trailing slash matters: links are built as `${BASE_URL}path`, so the base
  // must end in '/' or GitHub Pages URLs collapse to `/dominion-realmpath`.
  base: onGitHubPages ? '/dominion-realm/' : '/',

  // Self-hosted fonts (Astro 6). Downloads + caches at build time, generates
  // optimized fallbacks, and emits preload hints. No runtime Google request.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display',
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
    },
    {
      provider: fontProviders.google(),
      name: 'Spectral',
      cssVariable: '--font-body',
      weights: [300, 400, 500],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
    },
    {
      provider: fontProviders.google(),
      name: 'Space Mono',
      cssVariable: '--font-mono',
      weights: [400, 700],
      subsets: ['latin'],
    },
  ],
});
