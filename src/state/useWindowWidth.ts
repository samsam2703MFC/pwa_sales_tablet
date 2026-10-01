import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

/** Current window.innerWidth, re-rendering on resize. */
export const useWindowWidth = (): number =>
  useSyncExternalStore(subscribe, () => window.innerWidth, () => 1200);
