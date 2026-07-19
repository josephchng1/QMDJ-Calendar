import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The engine (src/engine/*) imports sibling modules with explicit .ts extensions
// (Node --experimental-strip-types style). esbuild/Vite resolves these fine at
// bundle time; tsconfig sets allowImportingTsExtensions so the IDE agrees.
//
// Tailwind runs through PostCSS (see postcss.config.js) using the v3 toolchain,
// which is pure JS. This is deliberate: Tailwind v4's native Oxide engine does
// not install/run inside StackBlitz WebContainers (npm install hangs there).
export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
});
