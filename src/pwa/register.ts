import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration (vite-plugin-pwa, Workbox `generateSW`, `autoUpdate`).
 *
 * The worker precaches the whole app on first load, so the book works offline. A new
 * deployment is fetched in the background on the next load (or when the tablet wakes up),
 * activates immediately and the page reloads once it takes control.
 *
 * No-op without service worker support (Vitest/jsdom, old WebViews); under `vite` dev the
 * plugin serves a stub module, so nothing is registered either.
 */
export function registerServiceWorker(nav: Navigator | undefined = globalThis.navigator): boolean {
  if (!nav || !('serviceWorker' in nav)) return false;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) checkForUpdatesOnWake(registration);
    },
  });
  return true;
}

/** Minimum delay between two update checks triggered by the page becoming visible again. */
export const WAKE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * A shop tablet keeps the app open for days: look for a new version when the page becomes
 * visible again (tablet unlocked, app brought back), at most once an hour. Errors (offline)
 * are ignored — the next check will retry.
 */
export function checkForUpdatesOnWake(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
  doc: Document = document,
  clock: () => number = Date.now,
): () => void {
  let last = clock();
  const onVisible = () => {
    if (doc.visibilityState !== 'visible' || clock() - last < WAKE_CHECK_INTERVAL_MS) return;
    last = clock();
    registration.update().catch(() => {});
  };
  doc.addEventListener('visibilitychange', onVisible);
  return () => doc.removeEventListener('visibilitychange', onVisible);
}

registerServiceWorker();
