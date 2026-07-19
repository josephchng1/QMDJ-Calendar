import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The engine (src/engine/*) imports sibling modules with explicit .ts extensions
// (Node --experimental-strip-types style). esbuild/Vite resolves these fine at
// bundle time; tsconfig sets allowImportingTsExtensions so the IDE agrees.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
});
