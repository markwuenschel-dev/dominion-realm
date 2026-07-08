'use client';

/**
 * Client-only Studio wrapper (ADR-0011). Importing `sanity.config` (and thus the
 * whole `sanity` package) MUST happen inside a `'use client'` module: `sanity`
 * uses React's `useEffectEvent`, which the `react-server` build doesn't export,
 * so pulling it into the RSC/server graph fails the build. Keeping the import
 * here confines `sanity` to the client bundle, where React exports everything.
 */
import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

export default function Studio() {
  return <NextStudio config={config} />;
}
