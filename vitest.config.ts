import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Standalone from vite.config.ts: the engine tests need neither React nor
// Tailwind, and run in a plain Node environment. '@engine' points at the
// vendored engine's public API so tests don't carry deep relative paths.
export default defineConfig({
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/engine/tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
