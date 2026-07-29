import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createMDX from '@next/mdx';
import { resolvePublicEnv } from './scripts/lib/public-env.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Next.js config for The Dominion Realm (migrated off Astro — ADR-0010; upgraded
 * to Next 16 for the Sanity media layer — ADR-0011).
 *
 * Served as a Node server on AWS EC2 (Docker container behind Caddy; `next start`),
 * so there is no static
 * `output: export` and no project base path — the site lives at `/`. MDX is
 * wired via `@next/mdx`; the codex/journal/reading *bodies* are compiled per
 * entry through `next-mdx-remote`-style `compileMDX` in `src/lib/content.ts`,
 * while page-level `.mdx` (if any) flows through this loader.
 *
 * Next 16 builds with Turbopack, which requires MDX plugin options to be
 * serializable — so the remark/rehype plugins are named as strings, not imported
 * function instances.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-gfm']],
    rehypePlugins: [['rehype-slug']],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  // Resolve the public ids through the one alias rule (scripts/lib/public-env.mjs)
  // so a `.env` carrying the Astro-era `PUBLIC_*` spelling works in dev exactly
  // as it does in CI. Next snapshots `NEXT_PUBLIC_*` out of the build env once,
  // at build time, so declaring them here is what puts them in the client bundle.
  env: resolvePublicEnv(),
  // Emit a self-contained server (.next/standalone) whose node_modules is traced
  // down to only what runtime needs — so the Docker image copies a few MB instead
  // of the whole dep tree, cutting deploy build time sharply. The Dockerfile then
  // copies .next/standalone + .next/static + public and runs `node server.js`.
  output: 'standalone',
  // Pin the tracing/workspace root so a stray parent lockfile doesn't misinfer it
  // (also the root standalone traces from).
  outputFileTracingRoot: projectRoot,
  // Type-check inside the build. The Docker build on the box is the last gate
  // before a deploy — CI runs only on pull requests, and there is no pre-commit
  // hook — so a direct push to main followed by `deploy.ps1` must not be able to
  // ship a type error. Lint stays out of the build by construction: Next 16
  // dropped in-build ESLint (the `eslint` config key is no longer recognized);
  // oxlint owns linting, in CI and locally.
  images: {
    formats: ['image/avif', 'image/webp'],
    // Media served from the Sanity image CDN (ADR-0011). Local art (public/,
    // src/content) still resolves without a remote pattern.
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
};

export default withMDX(nextConfig);
