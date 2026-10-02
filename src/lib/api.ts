/**
 * Where the back-office (BO) lives, seen from the app.
 *
 * The app is served from its own folder of the BO's public directory
 * (`…/consulant_bo/tablette/`), so both roots are derived from that folder, never from the
 * domain root: the API is `../api/cockpit` (`…/consulant_bo/api/cockpit`, as the BO's other
 * sub-apps call it) and BO files such as product photos (`uploads/…`) resolve against `../`
 * (`…/consulant_bo/`). The same build therefore works at any path. Under `vite` dev
 * (BASE_URL '/') this gives `/api/cockpit` and `/`, which the dev server proxies to a BO dev
 * server (vite.config.ts).
 *
 * `VITE_API_BASE` (build time) overrides the API root ('auto' or empty = derived).
 */
export interface Roots {
  /** The app's folder, e.g. 'http://host/consulant_bo/tablette/'. */
  app: string;
  /** API root without a trailing slash, e.g. 'http://host/consulant_bo/api/cockpit'. */
  api: string;
  /** BO public root, e.g. 'http://host/consulant_bo/' (for 'uploads/…' paths). */
  pub: string;
}

export function roots(href: string, base: string, apiOverride?: string): Roots {
  const app = new URL(base, href);
  const override = apiOverride && apiOverride !== 'auto' ? new URL(apiOverride, app).href : null;
  return {
    app: app.href,
    api: (override ?? new URL('../api/cockpit', app).href).replace(/\/+$/, ''),
    pub: new URL('../', app).href,
  };
}

const ROOTS = roots(
  typeof location === 'undefined' ? 'http://localhost/' : location.href,
  import.meta.env.BASE_URL,
  import.meta.env.VITE_API_BASE as string | undefined,
);

export const API_ROOT = ROOTS.api;
export const PUBLIC_ROOT = ROOTS.pub;
