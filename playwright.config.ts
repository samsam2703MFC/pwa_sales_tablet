import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests, run against the production build (service worker included).
 *
 *   npm run test:e2e                     builds (tsc + vite build), serves dist/ on :4173, runs
 *                                        (fails fast if :4173 is taken, e.g. by `npm run preview`)
 *   E2E_SKIP_BUILD=1 npm run test:e2e    reuses the existing dist/ (or a server already on :4173)
 *
 * Two tablet projects mirror the two layouts of the app: landscape (sidebar, ≥ 1000 px)
 * and portrait (header + bottom tab bar, < 1000 px).
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const PREVIEW = `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`;
const SKIP_BUILD = !!process.env.E2E_SKIP_BUILD && process.env.E2E_SKIP_BUILD !== '0';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'fr-BE',
    timezoneId: 'Europe/Brussels',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'landscape',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, hasTouch: true },
    },
    {
      name: 'portrait',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
  ],
  webServer: {
    command: SKIP_BUILD ? PREVIEW : `npm run build && ${PREVIEW}`,
    url: BASE_URL,
    // Reusing a server would skip the build: a stale `npm run preview` (also :4173) would then be
    // tested silently. Only reuse one when the build is skipped on purpose.
    reuseExistingServer: SKIP_BUILD && !process.env.CI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
