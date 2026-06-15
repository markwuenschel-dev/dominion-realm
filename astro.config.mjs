import { defineConfig } from 'astro/config';

// GitHub Actions sets GITHUB_ACTIONS=true automatically, so the Pages build
// serves under the project base path. Netlify and local builds serve from root.
// No manual flag to remember — the environment decides.
const onGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: onGitHubPages
    ? 'https://markwuenschel-dev.github.io'
    : 'https://dominion-realm.netlify.app', // ← change to your real Netlify URL
  base: onGitHubPages ? '/dominion-realm' : '/',
});
