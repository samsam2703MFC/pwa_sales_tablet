import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerSW = vi.fn();
vi.mock('virtual:pwa-register', () => ({ registerSW }));

const { registerServiceWorker, checkForUpdatesOnWake, WAKE_CHECK_INTERVAL_MS } = await import('./register');

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
});

describe('checkForUpdatesOnWake', () => {
  function setup(visibility: DocumentVisibilityState = 'visible') {
    let now = 0;
    const update = vi.fn(() => Promise.resolve());
    const doc = document.implementation.createHTMLDocument('t');
    Object.defineProperty(doc, 'visibilityState', { get: () => visibility, configurable: true });
    const stop = checkForUpdatesOnWake({ update } as unknown as ServiceWorkerRegistration, doc, () => now);
    return {
      update,
      stop,
      wake: () => doc.dispatchEvent(new Event('visibilitychange')),
      advance: (ms: number) => { now += ms; },
      hide: () => { visibility = 'hidden'; },
      show: () => { visibility = 'visible'; },
    };
  }

  it('checks for a new version when the page becomes visible, at most once an hour', () => {
    const t = setup();
    t.wake();
    expect(t.update).not.toHaveBeenCalled(); // just registered
    t.advance(WAKE_CHECK_INTERVAL_MS);
    t.wake();
    expect(t.update).toHaveBeenCalledTimes(1);
    t.advance(WAKE_CHECK_INTERVAL_MS - 1);
    t.wake();
    expect(t.update).toHaveBeenCalledTimes(1);
    t.advance(1);
    t.wake();
    expect(t.update).toHaveBeenCalledTimes(2);
  });

  it('ignores the page being hidden, and stops listening when disposed', () => {
    const t = setup();
    t.advance(WAKE_CHECK_INTERVAL_MS);
    t.hide();
    t.wake();
    expect(t.update).not.toHaveBeenCalled();
    t.show();
    t.stop();
    t.wake();
    expect(t.update).not.toHaveBeenCalled();
  });

  it('swallows update errors (offline)', async () => {
    const t = setup();
    t.update.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    t.advance(WAKE_CHECK_INTERVAL_MS);
    expect(() => t.wake()).not.toThrow();
    await Promise.resolve();
    expect(t.update).toHaveBeenCalledTimes(1);
  });
});
