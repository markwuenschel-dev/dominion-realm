import type { Credit } from '@/sanity/media';

/**
 * The low-emphasis “Art by —” line shown beneath a full/detail image, in the
 * gallery lightbox, and under the homepage cover (ADR-0011, Phase 4). Card grids
 * and thumbnails deliberately omit it — they link through to a surface that
 * carries the credit, so every credited Asset still has one reachable public
 * credit surface.
 *
 * Renders nothing when there's no credit. When the Asset carries a validated
 * `creditUrl`, the name becomes a safe outbound link (`nofollow noopener`); the
 * URL is never parsed out of the name. Private licence notes are resolved away
 * upstream (`resolve` in `@/sanity/media`) and never reach this component.
 *
 * No `'use client'` and no hooks, so it renders in both Server Components (cover,
 * codex detail) and the Client lightbox; only its `Credit` type is imported, and
 * `import type` is erased at build.
 */
export function ImageCredit({ credit, className }: { credit: Credit | null; className?: string }) {
  if (!credit) return null;
  return (
    <p className={className ? `image-credit ${className}` : 'image-credit'}>
      Art by{' '}
      {credit.url ? (
        <a href={credit.url} target="_blank" rel="noopener noreferrer nofollow">
          {credit.name}
        </a>
      ) : (
        credit.name
      )}
    </p>
  );
}
