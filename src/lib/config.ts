import type { Lang } from '../data/types';

/**
 * App configuration — the prototype's component props, plus the shop.
 *
 * - `defaultLang` ('FR' | 'NL'): initial language. Build-time `VITE_DEFAULT_LANG`,
 *   overridable at runtime with `?lang=nl`.
 * - `showPrices` (boolean): hides every price when false. Build-time
 *   `VITE_SHOW_PRICES=false`, overridable at runtime with `?prices=0`.
 * - `?date=YYYY-MM-DD` pins "today" (season of the moment, calendar highlight,
 *   header date) — handy for demos and screenshots.
 * - `?shop=<id>` (digits, the BO's shop id) picks the shop whose book the BO sends. It is
 *   remembered on the device (localStorage `bv.shop`): the installed app opens its start URL
 *   without the query string. `?shop=` (empty) forgets it.
 */
export interface AppConfig {
  defaultLang: Lang;
  showPrices: boolean;
  /** Fixed "today", or null to use the device clock. */
  date: Date | null;
  /** BO shop id, or null for the network-wide book. */
  shop: string | null;
}

/** localStorage key of the remembered shop id. */
export const SHOP_KEY = 'bv.shop';

/** The few Storage methods used; any of them may throw (private mode, blocked site data). */
export type ShopStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const SHOP_ID = /^\d{1,9}$/;

/** fn(), or `fallback` when it throws (storage unavailable). */
export const safely = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/**
 * The shop: `?shop=<digits>` (remembered), `?shop=` (forgotten: network-wide book), else the
 * remembered one. A malformed value is ignored. Storage errors are swallowed: the app then
 * simply does not remember the shop.
 */
export function readShop(search: string, storage: ShopStorage | null): string | null {
  const v = new URLSearchParams(search).get('shop')?.trim();
  if (v === '') {
    safely(() => storage?.removeItem(SHOP_KEY), undefined);
    return null;
  }
  if (v && SHOP_ID.test(v)) {
    safely(() => storage?.setItem(SHOP_KEY, v), undefined);
    return v;
  }
  const saved = safely(() => storage?.getItem(SHOP_KEY) ?? null, null);
  return saved !== null && SHOP_ID.test(saved) ? saved : null;
}

/** window.localStorage, or null where reading it throws (sandboxed frames, blocked storage). */
export const localStore = (): ShopStorage | null => safely(() => (typeof window === 'undefined' ? null : window.localStorage), null);

const parseBool = (v: string | null | undefined): boolean | null => {
  if (v == null || v === '') return null;
  return !/^(0|false|no|off)$/i.test(v);
};

const parseLang = (v: string | null | undefined): Lang | null => {
  if (!v) return null;
  return v.toUpperCase() === 'NL' ? 1 : v.toUpperCase() === 'FR' ? 0 : null;
};

/** 'YYYY-MM-DD' → that day at local noon, or null when malformed or impossible. */
const parseDate = (v: string | null | undefined): Date | null => {
  const m = v && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [y, mo, da] = [m[1], m[2], m[3]].map(Number);
  const d = new Date(y, mo - 1, da, 12);
  // Date rolls 2026-02-30 over to 2 March and maps years 0–99 to 19xx: reject anything
  // that does not round-trip, so a mistyped URL falls back to the device clock.
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === da ? d : null;
};

/** `storage` remembers the shop (null: nothing read or written). */
export function readConfig(search: string, env: Record<string, string | undefined>, storage: ShopStorage | null = null): AppConfig {
  const p = new URLSearchParams(search);
  return {
    defaultLang: parseLang(p.get('lang')) ?? parseLang(env.VITE_DEFAULT_LANG) ?? 0,
    showPrices: parseBool(p.get('prices')) ?? parseBool(env.VITE_SHOW_PRICES) ?? true,
    date: parseDate(p.get('date')),
    shop: readShop(search, storage),
  };
}

export const config: AppConfig = readConfig(
  typeof window === 'undefined' ? '' : window.location.search,
  import.meta.env as Record<string, string | undefined>,
  localStore(),
);
