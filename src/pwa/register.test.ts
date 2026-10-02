import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registerSW = vi.fn();
vi.mock('virtual:pwa-register', () => ({ registerSW }));

const { registerServiceWorker, watchForUpdates, reloadWhenIdle, UPDATE_CHECK_INTERVAL_MS, UPDATE_POLL_MS, RELOAD_IDLE_MS } =
  await import('./register');

const MIN = 60 * 1000;

/** A detached document whose visibility the test controls. */
function fakeDoc(initial: DocumentVisibilityState = 'visible') {
  let visibility = initial;
  const doc = document.implementation.createHTMLDocument('t');
  Object.defineProperty(doc, 'visibilityState', { get: () => visibility, configurable: true });
  const set = (v: DocumentVisibilityState) => {
    visibility = v;
    doc.dispatchEvent(new Event('visibilitychange'));
  };
  return { doc, hide: () => set('hidden'), show: () => set('visible') };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('registerServiceWorker', () => {
  beforeEach(() => registerSW.mockClear());

  it('does nothing without service worker support (jsdom, old WebViews)', () => {
    expect('serviceWorker' in navigator).toBe(false);
    expect(registerServiceWorker()).toBe(false);
    expect(registerServiceWorker(undefined)).toBe(false);
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('registers immediately when supported', () => {
    const nav = { serviceWorker: {} } as unknown as Navigator;
    expect(registerServiceWorker(nav)).toBe(true);
    expect(registerSW).toHaveBeenCalledTimes(1);
    expect(registerSW.mock.calls[0][0]).toMatchObject({ immediate: true });
  });

  // Keep these two in this order: the "touched since load" flag is per page (module state).
  it('reloads at once when a new version takes control before anybody touched the page (update found at launch)', () => {
    const reload = vi.fn();
    registerServiceWorker({ serviceWorker: {} } as unknown as Navigator, reload);
    const { onNeedReload } = registerSW.mock.calls[0][0] as { onNeedReload: () => void };
    expect(document.visibilityState).toBe('visible');
    onNeedReload();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not let the plugin reload at once when a new version takes control: waits for the tablet to be idle', () => {
    window.dispatchEvent(new Event('pointerdown')); // the page is in use
    const reload = vi.fn();
    registerServiceWorker({ serviceWorker: {} } as unknown as Navigator, reload);
    const { onNeedReload } = registerSW.mock.calls[0][0] as { onNeedReload: () => void };
    expect(document.visibilityState).toBe('visible');
    onNeedReload();
    onNeedReload(); // a second activation while waiting does not arm a second reload
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(RELOAD_IDLE_MS);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('watchForUpdates', () => {
  function setup(online = true) {
    const update = vi.fn(() => Promise.resolve());
    const page = fakeDoc();
    const nav = { onLine: online };
    const stop = watchForUpdates({ update } as unknown as ServiceWorkerRegistration, { doc: page.doc, nav });
    return { update, stop, nav, ...page };
  }

  it('checks once an hour while the page stays visible (always-on counter tablet)', () => {
    const t = setup();
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - UPDATE_POLL_MS);
    expect(t.update).not.toHaveBeenCalled(); // just registered (checked at load)
    vi.advanceTimersByTime(UPDATE_POLL_MS);
    expect(t.update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - 1);
    expect(t.update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UPDATE_POLL_MS);
    expect(t.update).toHaveBeenCalledTimes(2);
  });

  it('checks when the page becomes visible again, at most once an hour', () => {
    const t = setup();
    t.hide();
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS + UPDATE_POLL_MS);
    expect(t.update).not.toHaveBeenCalled(); // no check while hidden
    t.show();
    expect(t.update).toHaveBeenCalledTimes(1);
    t.hide();
    t.show();
    expect(t.update).toHaveBeenCalledTimes(1);
  });

  it('skips the check while offline, and retries once back online', () => {
    const t = setup(false);
    vi.advanceTimersByTime(2 * UPDATE_CHECK_INTERVAL_MS);
    expect(t.update).not.toHaveBeenCalled();
    t.nav.onLine = true;
    vi.advanceTimersByTime(UPDATE_POLL_MS);
    expect(t.update).toHaveBeenCalledTimes(1);
  });

  it('swallows update errors (network down)', async () => {
    const t = setup();
    t.update.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    expect(() => vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS)).not.toThrow();
    await Promise.resolve();
    expect(t.update).toHaveBeenCalledTimes(1);
  });

  it('stops polling and listening when disposed', () => {
    const t = setup();
    t.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(2 * UPDATE_CHECK_INTERVAL_MS);
    t.hide();
    t.show();
    expect(t.update).not.toHaveBeenCalled();
  });
});

describe('reloadWhenIdle', () => {
  function setup(visibility: DocumentVisibilityState = 'visible') {
    const reload = vi.fn();
    const page = fakeDoc(visibility);
    const target = new EventTarget();
    const cancel = reloadWhenIdle({ reload, doc: page.doc, target, untouched: false });
    const input = (type = 'pointerdown') => target.dispatchEvent(new Event(type));
    return { reload, cancel, input, ...page };
  }

  it('reloads at once when the page is hidden', () => {
    const t = setup('hidden');
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once when nobody has touched the page since it loaded', () => {
    const reload = vi.fn();
    reloadWhenIdle({ reload, doc: fakeDoc().doc, target: new EventTarget(), untouched: true });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits until nobody has touched the tablet for two minutes', () => {
    const t = setup();
    vi.advanceTimersByTime(RELOAD_IDLE_MS - MIN);
    t.input('pointerdown');
    vi.advanceTimersByTime(RELOAD_IDLE_MS - MIN);
    t.input('keydown');
    vi.advanceTimersByTime(RELOAD_IDLE_MS - 1);
    expect(t.reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(t.reload).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10 * RELOAD_IDLE_MS);
    t.input();
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reloads as soon as the page gets hidden (tablet locked) while waiting', () => {
    const t = setup();
    t.input();
    t.hide();
    expect(t.reload).toHaveBeenCalledTimes(1);
    t.show();
    t.hide();
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', () => {
    const t = setup();
    t.cancel();
    vi.advanceTimersByTime(2 * RELOAD_IDLE_MS);
    t.hide();
    expect(t.reload).not.toHaveBeenCalled();
  });
});
