import { useSyncExternalStore } from 'react';

/** Landscape layout from this layout-viewport width up (sidebar, side drawer). */
export const WIDE_QUERY = '(min-width: 1000px)';

const wide = (): MediaQueryList => window.matchMedia(WIDE_QUERY);

const subscribe = (cb: () => void) => {
  const mq = wide();
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/**
 * Portrait / narrow layout: layout viewport narrower than 1000 px, re-rendering when it
 * crosses that width (rotation, Split View).
 *
 * A media query rather than `window.innerWidth`: on iOS/iPadOS WebKit, innerWidth is the
 * width of the *visible* (pinch-zoomed) area, so a zoom on a landscape iPad would drop it
 * under 1000 and flip the app to the portrait layout on the next render. Width media
 * queries follow the layout viewport, which pinch-zoom does not change. (The prototype
 * only samples innerWidth on `resize`, which pinch-zoom does not fire.)
 */
export const useCompact = (): boolean =>
  useSyncExternalStore(subscribe, () => !wide().matches, () => false);
