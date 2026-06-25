import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vitest configuration (Tier 2 + 2b testing foundation).
 *
 * Runs in the `jsdom` environment so React component tests work; the lib tests
 * still pass because jsdom runs in Node, so `fs`/`process`/`vi.stubEnv` remain
 * available. The `react()` plugin gives the proper automatic-JSX transform for
 * the React 19 components under test.
 *
 * Two aliases make the server-side content libs importable from tests:
 *   - `@`           → ./src, mirroring the tsconfig path alias.
 *   - `server-only` → an empty stub, since the real package throws outside a
 *                     React Server Component bundle (content.ts/search.ts import it).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup-dom.ts'],
  },
  resolve: {
    alias: {
      'server-only': path.resolve('test/stubs/server-only.ts'),
      '@': path.resolve('src'),
    },
  },
});
