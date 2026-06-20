import { defineConfig, fontProviders } from 'astro/config';

// GitHub Actions sets GITHUB_ACTIONS=true automatically, so the Pages build
// serves under the project base path. Netlify and local builds serve from root.
const onGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
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
