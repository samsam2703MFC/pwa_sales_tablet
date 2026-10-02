/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Brand colours (design system L'Atelier By): beige page background. */
const BEIGE = '#EAE4DC';

/**
 * BO dev server the dev server forwards the API and BO files to (`/api/…`, `/uploads/…`):
 * in consultant_bo, `php -S 127.0.0.1:8080 -t public public/router.php`. Without it the app
 * shows its sample data.
 */
const BO_DEV = 'http://127.0.0.1:8080';

// https://vite.dev/config/
export default defineConfig({
  // Relative URLs: one dist/ can be served at any path (no client-side routes; the manifest
  // start_url/scope and the image URLs built from BASE_URL are relative too). Dev still serves at '/'.
  base: './',
  server: {
    proxy: { '/api': BO_DEV, '/uploads': BO_DEV },
  },
  // `vite preview` would inherit server.proxy: keep it off so the e2e suite (and a plain
  // preview) never reaches a local BO; the app then falls back to its sample data.
  preview: {
    proxy: {},
  },
  plugins: [
    react(),
    VitePWA({
      // New versions install in the background and activate at once; the page reloads onto
      // them only when nobody is using the tablet (src/pwa/register.ts, which registers the
      // worker itself and passes onNeedReload so the plugin does not reload on the spot).
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
        // No explicit `id`: the app identity is then start_url, i.e. the folder dist/ is served
        // from (https://intranet/book-vendeuses/). A relative `id` would be resolved against the
        // origin, not start_url, so under a sub-path it would claim the origin root and clash with
        // any other app installed from that host. Keep start_url as is: changing it (e.g. adding a
        // query string) would change the identity and install a second app.
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
        // illustration of public/img and the icons. The BO data is cached at runtime (below).
        globPatterns: ['**/*.{js,css,html,png,ico,svg,otf,ttf,woff2}'],
        // Every asset is well under this (largest illustration ≈ 110 KB, largest font ≈ 245 KB).
        // Anything over the limit would silently be left out of the cache
        // (e2e/pwa.spec.ts checks that every image is precached).
        maximumFileSizeToCacheInBytes: 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // BO data (src/data/remote.ts). The worker sees these requests although they are
        // outside its scope (../api, ../uploads): they come from a page it controls.
        // The matchers and the plugin are copied into sw.js as source: no outside variables.
        runtimeCaching: [
          {
            // The book: always the BO's latest when it answers within 4 s, else the last one
            // received (offline, BO down or answering an error). Responses from the cache get an
            // `x-bv-cache: 1` header, so the app shows "Hors ligne · données du …".
            urlPattern: ({ url }) => url.pathname.endsWith('/tablette/book'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bv-book',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 5 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  // A BO error page or anything but JSON (e.g. an HTML fallback page) counts as
                  // a network failure: it never replaces the last good book, which is served instead.
                  fetchDidSucceed: async ({ response }) => {
                    if (response.status === 200 && /json/i.test(response.headers.get('content-type') || '')) return response;
                    throw new Error(`book: HTTP ${response.status}`);
                  },
                  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
                    if (!cachedResponse) return cachedResponse;
                    const headers = new Headers(cachedResponse.headers);
                    headers.set('x-bv-cache', '1');
                    return new Response(cachedResponse.body, { status: cachedResponse.status, statusText: cachedResponse.statusText, headers });
                  },
                },
              ],
            },
          },
          {
            // Product photos (640 px thumbnails, else panel originals): downloaded once, also
            // in the background (src/data/warmPhotos.ts), so the range shows them offline.
            urlPattern: ({ url }) => /\/uploads\/(?:tablette|plano\/panel)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bv-photos',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 24 * 60 * 60, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
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
