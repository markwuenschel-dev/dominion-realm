import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { RevealGate } from '@/components/reveal/RevealGate';
import { RevealInline } from '@/components/reveal/RevealInline';

/**
 * In-world components authors may use directly in codex/journal MDX bodies. The
 * `/rsc` MDXRemote entrypoint does NOT read the global `useMDXComponents`
 * provider (unlike file-routed MDX), so components must be passed explicitly
 * here. `<RevealGate>` layers teaser → reader → deep prose blocks; `<Reveal>`
 * seals a word or phrase inline (ADR-0004). Both are client components rendered
 * inside this server MDX pass — keep gated content presentational.
 */
const mdxComponents = { RevealGate, Reveal: RevealInline };

/**
 * Renders a raw MDX body string (loaded by `src/lib/content.ts`) as a server
 * component. Same remark/rehype pipeline as `next.config.mjs` so page-routed and
 * loader-driven MDX render identically.
 */
export function MdxBody({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={mdxComponents}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }}
    />
  );
}
