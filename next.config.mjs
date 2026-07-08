import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createMDX from '@next/mdx';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Next.js config for The Dominion Realm (migrated off Astro — ADR-0010; upgraded
 * to Next 16 for the Sanity media layer — ADR-0011).
 *
 * Served as a Node server on Railway (`next start`), so there is no static
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
  // Railway (Railpack builder) runs `next build` then `next start` (reads $PORT).
  // Pin the tracing/workspace root so a stray parent lockfile doesn't misinfer it.
  outputFileTracingRoot: projectRoot,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Media served from the Sanity image CDN (ADR-0011). Local art (public/,
    // src/content) still resolves without a remote pattern.
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
};

export default withMDX(nextConfig);
