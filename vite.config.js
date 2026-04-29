import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // selfDestroying: the next time a previously-installed PWA loads, the
      // generated Service Worker actively UNREGISTERS itself + DELETES every
      // cache it created, then never re-installs. This is the only reliable
      // way to clear a stuck SW from Marc's iPhone — after this deploy,
      // every device that still has the old buggy SW will get a one-time
      // cleanup on next visit and then run as a plain SPA.
      //
      // We can re-enable proper SW caching after the demo, once we have
      // a versioned-asset story that guarantees clean upgrades.
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['logo-cgs.png', 'apple-touch-icon.png'],
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
