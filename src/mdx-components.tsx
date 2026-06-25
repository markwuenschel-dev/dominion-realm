import type { MDXComponents } from 'mdx/types';

/**
 * Global MDX component overrides (required by `@next/mdx` in the App Router).
 * Codex/journal/reading prose is plain MDX for now; this is where we map HTML
 * elements to themed components or expose in-world components (e.g. a future
 * <RevealGate> usable inline in MDX) as the content grows.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
