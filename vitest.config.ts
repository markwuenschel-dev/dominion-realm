import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest configuration (Tier 2 testing foundation).
 *
 * Lib code runs in the `node` environment. Two aliases make the server-side
 * content libs importable from tests:
 *   - `@`           → ./src, mirroring the tsconfig path alias.
 *   - `server-only` → an empty stub, since the real package throws outside a
 *                     React Server Component bundle (content.ts/search.ts import it).
 *
 * Component tests (jsdom + Testing Library) are a deliberate follow-on and are
 * not configured here yet.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'server-only': path.resolve('test/stubs/server-only.ts'),
      '@': path.resolve('src'),
    },
  },
});
