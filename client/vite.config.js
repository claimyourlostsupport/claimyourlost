import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Writes dist/_redirects after build. Cloudflare Pages is unreliable with Functions-only
 * /share/social/* handling (404). A 302 to the API preserves the public hostname for the
 * first hop; crawlers follow and read Open Graph HTML on the API.
 */
function cloudflarePagesRedirects() {
  return {
    name: 'cloudflare-pages-redirects',
    closeBundle() {
      const api = String(process.env.VITE_API_URL || '').trim().replace(/\/$/, '');
      const lines = ['# Cloudflare Pages: specific rules first, then SPA fallback.'];
      if (/^https:\/\//i.test(api)) {
        lines.push(`/share/social/*  ${api}/share/social/:splat  302`);
      }
      lines.push('/*    /index.html   200');
      lines.push('');
      const out = path.resolve(__dirname, 'dist', '_redirects');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, lines.join('\n'), 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), cloudflarePagesRedirects()],
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  },
  server: {
    port: 5173,
    /** Listen on LAN so phones on the same Wi-Fi can open http://YOUR_PC_IP:5173 */
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      /** Same as production _redirects: OG HTML comes from the API. */
      '/share': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
