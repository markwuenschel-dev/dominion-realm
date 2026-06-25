import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Next.js config for The Dominion Realm (migrated off Astro — see ADR-0010).
 *
 * Served as a Node server on Railway (`next start`), so there is no static
 * `output: export` and no project base path — the site lives at `/`. MDX is
 * wired via `@next/mdx`; the codex/journal/reading *bodies* are compiled per
 * entry through `next-mdx-remote`-style `compileMDX` in `src/lib/content.ts`,
 * while page-level `.mdx` (if any) flows through this loader.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
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
    // Codex/journal art is bundled locally (public/ or src/content), so no
    // remote patterns are needed yet.
    formats: ['image/avif', 'image/webp'],
  },
};

export default withMDX(nextConfig);
