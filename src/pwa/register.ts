import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration (vite-plugin-pwa, Workbox `generateSW`, `autoUpdate`).
 *
 * The worker precaches the whole app on first load, so the book works offline. A new
 * deployment is looked for at load and then at most once an hour while the app is open
 * (see `watchForUpdates`); it installs in the background and activates immediately, and
 * the page reloads onto it at once if nobody has touched it since it loaded, else as soon as
 * nobody is using the tablet (see `reloadWhenIdle`): never in the middle of a sale.
 *
 * No-op without service worker support (Vitest/jsdom, old WebViews); under `vite` dev the
 * plugin serves a stub module, so nothing is registered either.
 */
export function registerServiceWorker(
  nav: Navigator | undefined = globalThis.navigator,
  reload: () => void = () => location.reload(),
): boolean {
  if (!nav || !('serviceWorker' in nav)) return false;
  let reloading = false;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration);
    },
    // A new version took control. Without this hook the plugin reloads at once, which
    // could wipe the sheet a seller is showing to a customer.
    onNeedReload() {
      if (reloading) return;
      reloading = true;
      reloadWhenIdle({ reload });
    },
  });
  return true;
}

/** Minimum delay between two update checks. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * How often a visible page looks whether a check is due. Short, so the hourly throttle
 * (not the timer phase) decides when the real checks happen.
 */
export const UPDATE_POLL_MS = 5 * 60 * 1000;

export interface WatchOptions {
  doc?: Document;
  nav?: Pick<Navigator, 'onLine'>;
  clock?: () => number;
  setInterval?: (fn: () => void, ms: number) => ReturnType<typeof globalThis.setInterval>;
  clearInterval?: (id: ReturnType<typeof globalThis.setInterval>) => void;
}

/**
 * A shop tablet keeps the app open for days, often with the screen always on, and a
 * single-page app never navigates — so the browser itself never looks for a new worker.
 * Check at most once an hour: while the page stays visible (polled), and when it becomes
 * visible again (tablet unlocked, app brought back). Skipped while hidden or offline;
 * update errors are ignored — the next poll retries.
 * Returns a disposer that stops the polling and the listener.
 */
export function watchForUpdates(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
  {
    doc = document,
    nav = globalThis.navigator,
    clock = Date.now,
    setInterval = (fn, ms) => globalThis.setInterval(fn, ms),
    clearInterval = id => globalThis.clearInterval(id),
  }: WatchOptions = {},
): () => void {
  let last = clock();
  const check = () => {
    if (doc.visibilityState !== 'visible' || nav?.onLine === false) return;
    if (clock() - last < UPDATE_CHECK_INTERVAL_MS) return;
    last = clock();
    registration.update().catch(() => {});
  };
  doc.addEventListener('visibilitychange', check);
  const timer = setInterval(check, UPDATE_POLL_MS);
  return () => {
    clearInterval(timer);
    doc.removeEventListener('visibilitychange', check);
  };
}

/** No touch, key or wheel input for this long → the page may reload onto a new version. */
export const RELOAD_IDLE_MS = 2 * 60 * 1000;

const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel'] as const;

/** Set by the first touch or key press after the page loaded. */
let touched = false;
const markTouched = () => { touched = true; };
for (const type of ['pointerdown', 'keydown'] as const) {
  globalThis.addEventListener?.(type, markTouched, { capture: true, passive: true, once: true });
}

export interface ReloadOptions {
  reload?: () => void;
  doc?: Document;
  /** Where user input is listened for. */
  target?: EventTarget;
  idleMs?: number;
  /** Nobody has used the page since it loaded (update found at launch): reload at once. */
  untouched?: boolean;
}

/**
 * Reloads the page onto the new version without pulling it from under the staff: at once
 * if the page is hidden or nobody has touched it since it loaded, else once nobody has
 * touched the tablet for `idleMs` (each input restarts the wait), or as soon as the page
 * gets hidden. Returns a canceller.
 */
export function reloadWhenIdle({
  reload = () => location.reload(),
  doc = document,
  target = window,
  idleMs = RELOAD_IDLE_MS,
  untouched = !touched,
}: ReloadOptions = {}): () => void {
  if (doc.visibilityState === 'hidden' || untouched) {
    reload();
    return () => {};
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    for (const type of INPUT_EVENTS) target.removeEventListener(type, arm, true);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
  const fire = () => {
    stop();
    reload();
  };
  function arm() {
    clearTimeout(timer);
    timer = setTimeout(fire, idleMs);
  }
  function onVisibility() {
    if (doc.visibilityState === 'hidden') fire();
  }
  for (const type of INPUT_EVENTS) target.addEventListener(type, arm, { capture: true, passive: true });
  doc.addEventListener('visibilitychange', onVisibility);
  arm();
  return stop;
}

registerServiceWorker();
