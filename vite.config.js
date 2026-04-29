import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-cgs.png', 'apple-touch-icon.png'],
      // Activate new Service Worker immediately + claim every open client +
      // wipe leftover caches from previous builds. Without this, returning
      // users on an already-installed PWA can keep running an old bundle
      // long after a fix has shipped — e.g. Marc's phone running the buggy
      // logout HTTP-abort code path days after the fix was deployed.
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'CGS Porter',
        short_name: 'CGS Porter',
        description: 'Porter Service GVA — Geneva Airport',
        lang: 'fr',
        theme_color: '#e91e8c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true },
});
