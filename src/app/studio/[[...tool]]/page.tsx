/**
 * The embedded Sanity Studio (ADR-0011), served at `/studio/*` — the author's
 * picture editor, on their own domain, alongside Keystatic at `/keystatic`.
 *
 * This server shell only re-exports the Studio's viewport/metadata and renders
 * the client-only <Studio>. The `sanity` import lives in Studio.tsx behind
 * `'use client'` so it never enters the RSC graph (see that file).
 */
import Studio from './Studio';

export const dynamic = 'force-static';

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  return <Studio />;
}
