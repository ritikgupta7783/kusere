import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    // Keep Vite's dependency-optimisation cache inside the project drive (not node_modules/.vite on C:).
    cacheDir: path.resolve(here, '../.local/vite-cache'),
    server: {
      port: 5173,
      // Same-origin proxy: the browser talks only to :5173, so HTTP-only cookies and CSRF just work.
      proxy: { '/api': { target: apiTarget, changeOrigin: false } },
    },
    preview: { proxy: { '/api': { target: apiTarget } } },
    build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
  };
});
