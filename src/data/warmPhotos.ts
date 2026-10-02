/**
 * Background download of the BO product photos, so that every product shows its photo offline,
 * not only those a seller happened to open while online. The service worker keeps each photo
 * it fetches in the 'bv-photos' cache (vite.config.ts, runtimeCaching); this only asks for the
 * ones not cached yet, one at a time, with low priority, while the tablet is online, visible
 * and idle. Without a controlling service worker (plain http, old WebViews) it does nothing:
 * there would be nowhere to keep them.
 */

/** Cache the service worker keeps BO photos in (vite.config.ts). */
export const PHOTO_CACHE = 'bv-photos';

export interface WarmEnv {
  nav?: Navigator;
  doc?: Document;
  win?: Window & typeof globalThis;
}

/** Resolves once `ready()` holds, re-checked on each of the given [target, event] pairs. */
const until = (ready: () => boolean, on: readonly (readonly [EventTarget, string])[]): Promise<void> =>
  new Promise(resolve => {
    if (ready()) return resolve();
    const check = () => {
      if (!ready()) return;
      for (const [t, e] of on) t.removeEventListener(e, check);
      resolve();
    };
    for (const [t, e] of on) t.addEventListener(e, check);
  });

/** Number of photos downloaded (0 when there is nothing to do). */
export async function warmPhotos(urls: readonly string[], { nav = navigator, doc = document, win = window }: WarmEnv = {}): Promise<number> {
  const sw = nav.serviceWorker;
  if (!urls.length || !sw || !('caches' in win)) return 0;
  await sw.ready;
  // The first visit installs the worker: wait until it controls the page (clientsClaim).
  if (!sw.controller) await until(() => !!sw.controller, [[sw, 'controllerchange']]);
  const cache = await win.caches.open(PHOTO_CACHE);
  const idle = () =>
    new Promise<void>(resolve => (win.requestIdleCallback ? win.requestIdleCallback(() => resolve(), { timeout: 5000 }) : win.setTimeout(resolve, 200)));
  let done = 0;
  for (const url of new Set(urls)) {
    await until(() => nav.onLine !== false && doc.visibilityState === 'visible', [[win, 'online'], [doc, 'visibilitychange']]);
    await idle();
    if (await cache.match(url)) continue;
    try {
      const res = await win.fetch(url, { priority: 'low' } as RequestInit);
      // Read it to the end before asking for the next one (one download at a time).
      await res.arrayBuffer();
      if (res.ok) done++;
    } catch {
      // Offline again, or the BO went away: the next launch retries.
    }
  }
  return done;
}
