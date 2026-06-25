import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

/**
 * Renders a raw MDX body string (loaded by `src/lib/content.ts`) as a server
 * component. Same remark/rehype pipeline as `next.config.mjs` so page-routed and
 * loader-driven MDX render identically.
 */
export function MdxBody({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }}
    />
  );
}
