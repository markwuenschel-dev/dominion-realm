import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';

/**
 * Renders a raw MDX body string (loaded by `src/lib/content.ts`) as a server
 * component. Same remark/rehype pipeline as `next.config.mjs` so page-routed and
 * loader-driven MDX render identically — including Shiki syntax highlighting for
 * the code-heavy `questions`/`drills` collections.
 *
 * NOTE: these options are intentionally duplicated in `next.config.mjs`; the
 * two MDX pipelines must stay in sync (same convention as remark-gfm/rehype-slug).
 * `keepBackground: false` lets the site's own tokens frame the code block, and
 * the dual light/dark themes emit `--shiki-light`/`--shiki-dark` CSS variables
 * that `questions.css` switches on `[data-theme-mode]`.
 */
const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
};

export function MdxBody({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, [rehypePrettyCode, rehypePrettyCodeOptions]],
        },
      }}
    />
  );
}
