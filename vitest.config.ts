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
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/content/**',
        'src/styles/**',
        'src/app/**/layout.tsx',
        'src/sanity/schema/**',
      ],
      /**
       * A ratchet, not an aspiration. These numbers are the coverage this repo
       * actually had when instrumentation was added (45.27 / 37.41 / 41.13 /
       * 46.61 on 2026-08-08), rounded down to the nearest point so a stray
       * branch does not turn CI red on an unrelated change.
       *
       * The only correct edit to these numbers is upward. Raise them when a
       * PR earns it; never lower them to make a red build green.
       */
      thresholds: {
        statements: 45,
        branches: 37,
        functions: 41,
        lines: 46,
      },
    },
  },
  resolve: {
    alias: {
      'server-only': path.resolve('test/stubs/server-only.ts'),
      '@': path.resolve('src'),
    },
  },
});
