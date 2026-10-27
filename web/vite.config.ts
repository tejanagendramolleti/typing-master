import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Frontend-only build. No '/api' proxy — there is no backend in v1.
 * Output is plain static files in dist/, ready for Cloudflare Pages.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
})
