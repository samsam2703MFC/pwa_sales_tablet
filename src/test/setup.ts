// Vitest setup.
if (typeof window !== 'undefined') {
  // jsdom has no layout, so window.scrollTo is a no-op instead of a "Not implemented" error log.
  window.scrollTo = () => {};

  // jsdom has no matchMedia. Width queries are evaluated against window.innerWidth when read,
  // so tests keep setting the viewport with `Object.defineProperty(window, 'innerWidth', …)`;
  // a `resize` event then notifies the 'change' listeners whose result flipped.
  if (!window.matchMedia) window.matchMedia = fakeMatchMedia;
}

function fakeMatchMedia(query: string): MediaQueryList {
  const min = /min-width:\s*(\d+(?:\.\d+)?)px/.exec(query);
  const max = /max-width:\s*(\d+(?:\.\d+)?)px/.exec(query);
  const evaluate = () =>
    !!(min || max) &&
    (!min || window.innerWidth >= Number(min[1])) &&
    (!max || window.innerWidth <= Number(max[1]));

  type Listener = (this: MediaQueryList, e: MediaQueryListEvent) => void;
  const listeners = new Set<Listener>();
  let last = evaluate();
  const onResize = () => {
    const matches = evaluate();
    if (matches === last) return;
    last = matches;
    const e = Object.assign(new Event('change'), { matches, media: query }) as MediaQueryListEvent;
    listeners.forEach(l => l.call(mql, e));
    mql.onchange?.call(mql, e);
  };
  const add = (l: Listener) => {
    if (!listeners.size) {
      last = evaluate();
      window.addEventListener('resize', onResize);
    }
    listeners.add(l);
  };
  const remove = (l: Listener) => {
    listeners.delete(l);
    if (!listeners.size) window.removeEventListener('resize', onResize);
  };

  const mql = {
    media: query,
    onchange: null as Listener | null,
    get matches() { return evaluate(); },
    addEventListener: (_type: 'change', l: Listener) => add(l),
    removeEventListener: (_type: 'change', l: Listener) => remove(l),
    addListener: add,
    removeListener: remove,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
  return mql;
}
