import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // Automatically update the service worker when a new build is deployed
      registerType: 'autoUpdate',

      // Include the icon files in the precache manifest
      includeAssets: ['icons/*.png'],

      // Web App Manifest — controls how the app appears when installed
      manifest: {
        name:             'Rocket Crush',
        short_name:       'RocketCrush',
        description:      'A space-themed match-3 puzzle game.',
        theme_color:      '#0a0a1a',
        background_color: '#0a0a1a',
        display:          'standalone',
        orientation:      'portrait',
        scope:            '/',
        start_url:        '/',
        icons: [
          {
            src:   'icons/icon-192.png',
            sizes: '192x192',
            type:  'image/png',
          },
          {
            src:   'icons/icon-512.png',
            sizes: '512x512',
            type:  'image/png',
          },
          {
            src:     'icons/icon-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable', // safe-zone icon for Android adaptive icons
          },
        ],
      },

      workbox: {
        // Precache JS, CSS, HTML and small assets — but NOT the large spaceship PNGs.
        // Those are 5-6 MB each; precaching them would block the SW install.
        // They are handled by the runtimeCaching rule below instead.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],

        // Phaser's JS bundle is ~1.4 MB — raise the limit above the default 2 MB.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,

        // Spaceship images: cache on first use (CacheFirst) so they load instantly
        // on the second visit without needing to be in the precache manifest.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/rocket_.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rocket-images',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },

      // Keep the service worker disabled in dev so HMR is unaffected
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
