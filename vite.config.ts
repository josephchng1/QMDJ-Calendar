import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The engine (src/engine/*) imports sibling modules with explicit .ts extensions
// (Node --experimental-strip-types style). esbuild/Vite resolves these fine at
// bundle time; tsconfig sets allowImportingTsExtensions so the IDE agrees.
//
// Tailwind runs through PostCSS (see postcss.config.js) using the v3 toolchain,
// which is pure JS. This is deliberate: Tailwind v4's native Oxide engine does
// not install/run inside StackBlitz WebContainers (npm install hangs there).
export default defineConfig({
  plugins: [
    react(),
    // Offline: precache the built app shell + engine worker so a shared link opens
    // with no signal after one visit. No manifest — offline, not installable.
    VitePWA({ registerType: 'autoUpdate', manifest: false }),
  ],
  worker: { format: 'es' },
});
