/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Brand colours (design system L'Atelier By): beige page background. */
const BEIGE = '#EAE4DC';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // New versions install in the background, activate at once and the page reloads
      // (see src/pwa/register.ts, which registers the worker itself).
      registerType: 'autoUpdate',
      injectRegister: false,
      // The manifest icons are already matched by workbox.globPatterns (no duplicate entries).
      includeManifestIcons: false,
      manifest: {
        name: "Book vendeuses — L'Atelier By",
        short_name: 'Book vendeuses',
        description:
          "Le book des vendeuses L'Atelier By : gamme, saisons, allergènes, vente additionnelle, " +
          'FAQ clients, services, conservation et formation, en français et en néerlandais, même hors connexion.',
        lang: 'fr',
        dir: 'ltr',
        // Stable app identity (resolved against start_url, so it follows a sub-path deployment):
        // a future start_url change (e.g. a query string) will not create a second installed app.
        id: './',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: BEIGE,
        theme_color: BEIGE,
        categories: ['business', 'food', 'education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Offline-first: the whole app is precached on first load — shell, fonts, every
        // illustration of public/img and the icons. There is no network data to cache at runtime.
        globPatterns: ['**/*.{js,css,html,png,ico,svg,otf,ttf,woff2}'],
        // Every asset is well under this (largest illustration ≈ 110 KB, largest font ≈ 245 KB).
        // Anything over the limit would silently be left out of the cache
        // (e2e/pwa.spec.ts checks that every image is precached).
        maximumFileSizeToCacheInBytes: 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
