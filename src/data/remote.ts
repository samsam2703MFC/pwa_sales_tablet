import { SAMPLE_SOURCE } from './book';
import type { BookData, BookSource, Category, Diet, Product, ProductCombo, Season, T2 } from './types';

/**
 * The book sent by the back-office (GET `<API>/tablette/book?shop=<id>`, contract
 * "tablette-contract", schema 1): checked, then merged into the bundled sample.
 *
 * The BO sends the products, their categories and the seasons; everything else (the 14 EU
 * allergens, FAQ, services, sales reflexes, statistics, onboarding) stays the bundled sample.
 * Anything unexpected (BO unreachable, no BO at all as under `vite preview`, an HTML error
 * page, another schema, no valid product) falls back to the sample: the app always starts.
 */

/**
 * First start without a saved book: how long the start-up waits for the BO before showing the
 * sample. The BO's API commonly takes 2–6 s (the first build of a shop's book even longer).
 */
export const BOOK_TIMEOUT_MS = 15000;

/** Background refresh (the app is already on screen): the BO may take its time. */
export const REFRESH_TIMEOUT_MS = 45000;

/** localStorage key of the last BO book received (see `startBook`). */
export const BOOK_STORE_KEY = 'bv.book';

/** The few Storage methods used; any of them may throw (private mode, quota, blocked site data). */
export type BookStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The only payload schema this app understands. */
export const BOOK_SCHEMA = 1;

/**
 * Header the service worker adds to a book it served from its cache because the BO did not
 * answer (vite.config.ts, runtimeCaching): the data is then shown as offline data.
 */
export const CACHE_HEADER = 'x-bv-cache';

export const bookUrl = (apiRoot: string, shop: string | null): string =>
  `${apiRoot}/tablette/book${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`;

/** The part of the payload the app uses. */
export interface RemotePayload {
  version: string;
  generatedAt: string | null;
  shop: { id: string; name: string } | null;
  book: Pick<BookData, 'categories' | 'seasons' | 'products'>;
}

// --- Structural guard -----------------------------------------------------------------------

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isPrice = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
const isDays = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isDiet = (v: unknown): v is Diet => v === null || v === 'vegan' || v === 'vege';
const isMonths = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length > 0 && v.every(m => Number.isInteger(m) && m >= 1 && m <= 12);

/** A field present with a wrong type: the row parser throws, the row is dropped (`rows`). */
const bad = (): never => {
  throw new TypeError('malformed row');
};

/** Required value. */
const req = <X>(v: unknown, ok: (v: unknown) => v is X): X => (ok(v) ? v : bad());
/** Optional value: absent (undefined / null) → `dflt`. */
const opt = <X>(v: unknown, ok: (v: unknown) => v is X, dflt: X): X => (v == null ? dflt : req(v, ok));
/** [FR, NL] text; absent → ['', '']. */
const text = (v: unknown): T2 =>
  v == null ? ['', ''] : Array.isArray(v) && v.length === 2 && isStr(v[0]) && isStr(v[1]) ? [v[0], v[1]] : bad();
/** [FR, NL] name: the French one is required. */
const name = (v: unknown): T2 => {
  const n = text(v);
  return n[0].trim() ? n : bad();
};
/** List of ids; absent → []. */
const idList = (v: unknown): string[] => (v == null ? [] : Array.isArray(v) && v.every(isStr) ? [...v] : bad());
const id = (v: unknown): string => (isStr(v) && v.trim() ? v : bad());

const isTarget = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100);

/** A combo of a product (`combos`, contract "book"): `avec` is required. */
const toCombo = (v: unknown): ProductCombo => {
  const c = isRec(v) ? v : bad();
  return { with: name(c.avec), when: text(c.quand), name: text(c.nom), target: opt(c.cible, isTarget, null), items: idList(c.ids) };
};

/** The valid combos of a product; a malformed combo is dropped, not the product. */
const comboList = (v: unknown): ProductCombo[] =>
  Array.isArray(v)
    ? v.flatMap(c => {
      try {
        return [toCombo(c)];
      } catch {
        return [];
      }
    })
    : [];

/** A product row. Required: id, cat, French name, price (number or null), al, dlc (days). */
const toProduct = (v: Rec): Product => {
  const season = opt(v.season, isStr, '');
  const combos = comboList(v.combos);
  return {
    id: id(v.id), cat: id(v.cat), ...(season ? { season } : {}), img: opt(v.img, isStr, ''),
    price: 'price' in v ? req(v.price, isPrice) : bad(),
    unit: text(v.unit), best: opt(v.best, isBool, false),
    name: name(v.name), desc: text(v.desc), pitch: text(v.pitch), ingr: text(v.ingr),
    al: v.al === undefined ? bad() : idList(v.al), tr: idList(v.tr),
    // A BO row that does not say its lists are verified is treated as unverified.
    alKnown: opt(v.alKnown, isBool, false), trKnown: opt(v.trKnown, isBool, false), alRaw: opt(v.alRaw, isStr, ''),
    diet: opt(v.diet, isDiet, null), keep: text(v.keep), dlc: req(v.dlc, isDays),
    cross: idList(v.cross), crossLine: text(v.crossLine),
    ...(combos.length ? { combos } : {}),
  };
};

/** 'all' is the id of the "Tout" chip (src/data/validate.ts). */
const toCategory = (v: Rec): Category => ({ id: v.id === 'all' ? bad() : id(v.id), n: name(v.n) });

const toSeason = (v: Rec): Season => ({
  id: id(v.id), img: opt(v.img, isStr, ''), m: [...req(v.m, isMonths)], n: name(v.n), dates: text(v.dates), tip: text(v.tip),
});

/** Valid rows only, first occurrence of each id. */
function rows<X extends { id: string }>(v: unknown, parse: (v: Rec) => X): X[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  return v.flatMap(item => {
    let x: X;
    try {
      x = parse(isRec(item) ? item : bad());
    } catch {
      return [];
    }
    if (seen.has(x.id)) return [];
    seen.add(x.id);
    return [x];
  });
}

/**
 * Checks the BO payload. Malformed rows are dropped; null when the payload itself is unusable
 * (not schema 1, no version, no book, or not a single valid product).
 */
export function parsePayload(v: unknown): RemotePayload | null {
  if (!isRec(v) || v.schema !== BOOK_SCHEMA || !isStr(v.version) || !v.version || !isRec(v.book)) return null;
  const products = rows(v.book.products, toProduct);
  if (!products.length) return null;
  const shop = isRec(v.shop) && (isStr(v.shop.id) || typeof v.shop.id === 'number') && isStr(v.shop.nom)
    ? { id: String(v.shop.id), name: v.shop.nom }
    : null;
  return {
    version: v.version,
    generatedAt: isStr(v.genereLe) && v.genereLe ? v.genereLe : null,
    shop,
    book: { categories: rows(v.book.categories, toCategory), seasons: rows(v.book.seasons, toSeason), products },
  };
}

// --- Merge ---------------------------------------------------------------------------------

/**
 * Image of a BO record: BO files (`uploads/…`) become absolute URLs under the BO public root;
 * illustrations bundled with the app (`img/…`) stay app-relative (asset()); anything else, or
 * no picture, gives '' (placeholder illustration).
 */
export const remoteImg = (img: string, publicRoot: string): string =>
  img.startsWith('uploads/') ? new URL(img, publicRoot).href : img.startsWith('img/') ? img : '';

/**
 * The BO's products, categories and seasons in place of the sample ones; the rest of the sample
 * kept, its links to sample products dropped (combos that lose a product, FAQ product links,
 * statistics top lists). Allergen or trace ids outside the 14 EU allergens make that list
 * unverified (never "free of"). Unknown seasons and cross-sell ids are dropped.
 */
export function mergeBook(sample: BookData, remote: RemotePayload['book'], publicRoot: string): BookData {
  const allergenIds = new Set(sample.allergens.map(a => a.id));
  const seasonIds = new Set(remote.seasons.map(s => s.id));
  const productIds = new Set(remote.products.map(p => p.id));
  const known = (ids: readonly string[]) => ids.filter(id => productIds.has(id));

  const products = remote.products.map((p): Product => {
    const al = p.al.filter(a => allergenIds.has(a));
    const tr = p.tr.filter(a => allergenIds.has(a) && !al.includes(a));
    const { season, ...rest } = p;
    return {
      ...rest,
      ...(season && seasonIds.has(season) ? { season } : {}),
      img: remoteImg(p.img, publicRoot),
      al,
      tr,
      // Only an explicit true counts: BO data is unverified unless it says otherwise.
      alKnown: p.alKnown === true && al.length === p.al.length,
      trKnown: p.trKnown === true && p.tr.every(a => allergenIds.has(a)),
      cross: known(p.cross),
      ...(p.combos ? { combos: p.combos.map(c => ({ ...c, items: known(c.items) })) } : {}),
    };
  });

  return {
    ...sample,
    categories: remote.categories,
    seasons: remote.seasons.map(s => ({ ...s, img: remoteImg(s.img, publicRoot) })),
    products,
    // A combo is a fixed price for a fixed set: kept only when every product of it is known.
    combos: sample.combos.filter(c => c.items.length > 0 && c.items.every(id => productIds.has(id))),
    faq: sample.faq.map(f => (f.p ? { ...f, p: known(f.p) } : f)),
    stats: { ...sample.stats, sellers: sample.stats.sellers.map(s => ({ ...s, top: s.top.filter(([id]) => productIds.has(id)) })) },
  };
}

// --- Loading ---------------------------------------------------------------------------------

export interface FetchOptions {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/** The checked payload and whether the service worker served it from its cache; null on any failure. */
export async function fetchBook(
  url: string,
  { fetch = globalThis.fetch, timeoutMs = BOOK_TIMEOUT_MS }: FetchOptions = {},
): Promise<{ payload: RemotePayload; raw: unknown; fromCache: boolean } | null> {
  if (typeof fetch !== 'function') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: ctrl.signal });
    // vite preview / a static server answer the SPA's HTML or a 404 here: not a book.
    if (!res.ok || !/\bjson\b/i.test(res.headers.get('content-type') ?? '')) return null;
    const raw: unknown = await res.json();
    const payload = parsePayload(raw);
    return payload && { payload, raw, fromCache: res.headers.get(CACHE_HEADER) === '1' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- The book kept on the device -------------------------------------------------------------

/**
 * The last BO book received is kept in localStorage (key `bv.book`, about 100 KB), for the URL
 * it was asked with (so a tablet moved to another shop does not show the old shop's book).
 * It lets the tablet start at once — the BO can take several seconds to answer — and keeps
 * the BO data without network where there is no service worker (plain http). Storage errors
 * (quota, private mode) are ignored: the app then simply waits for the BO.
 */
export function readStoredBook(url: string, storage: BookStorage | null): RemotePayload | null {
  try {
    const s: unknown = JSON.parse(storage?.getItem(BOOK_STORE_KEY) ?? 'null');
    return isRec(s) && s.url === url ? parsePayload(s.payload) : null;
  } catch {
    return null;
  }
}

export function storeBook(url: string, raw: unknown, storage: BookStorage | null): void {
  try {
    storage?.setItem(BOOK_STORE_KEY, JSON.stringify({ url, payload: raw }));
  } catch {
    // Quota or storage blocked: nothing kept, the next start waits for the BO.
  }
}

// --- Loading ---------------------------------------------------------------------------------

export interface StartOptions extends FetchOptions {
  url: string;
  sample: BookData;
  publicRoot: string;
  /** navigator.onLine: a book received while offline is shown as offline data. */
  online?: boolean;
  storage?: BookStorage | null;
}

export interface StartResult {
  book: BookData;
  source: BookSource;
  /** Whether to ask the BO for a newer book right after start-up (`refreshBook`). */
  refresh: boolean;
}

const fromPayload = (payload: RemotePayload, sample: BookData, publicRoot: string, kind: BookSource['kind']): Omit<StartResult, 'refresh'> => ({
  book: mergeBook(sample, payload.book, publicRoot),
  source: { kind, version: payload.version, generatedAt: payload.generatedAt, shop: payload.shop },
});

/**
 * The book to start with, and where it comes from:
 * 1. the book kept on the device for this URL, at once (then refreshed in the background);
 * 2. else the BO's answer, waiting up to BOOK_TIMEOUT_MS (kept on the device);
 * 3. else the bundled sample (then refreshed in the background).
 * Never throws: the app always starts.
 */
export async function startBook({ url, sample, publicRoot, online = true, storage = null, ...opts }: StartOptions): Promise<StartResult> {
  const stored = readStoredBook(url, storage);
  if (stored) return { ...fromPayload(stored, sample, publicRoot, online ? 'bo' : 'cache'), refresh: online };
  try {
    const r = await fetchBook(url, opts);
    if (r) {
      if (!r.fromCache) storeBook(url, r.raw, storage);
      return { ...fromPayload(r.payload, sample, publicRoot, r.fromCache || !online ? 'cache' : 'bo'), refresh: r.fromCache };
    }
  } catch {
    // Never keep the app from starting: fall back to the sample.
  }
  return { book: sample, source: SAMPLE_SOURCE, refresh: true };
}

/**
 * Asks the BO for its current book (in the background, up to REFRESH_TIMEOUT_MS) and keeps a
 * fresh answer on the device. True when that book differs from `version` (null = the sample
 * is on screen): the caller then reloads onto it when the tablet is idle, and the next start
 * shows it at once. The service worker's cached copy (BO unreachable) or a failure is "no change".
 */
export async function refreshBook(
  url: string,
  version: string | null,
  storage: BookStorage | null,
  { timeoutMs = REFRESH_TIMEOUT_MS, ...opts }: FetchOptions = {},
): Promise<boolean> {
  const r = await fetchBook(url, { timeoutMs, ...opts });
  if (!r || r.fromCache) return false;
  storeBook(url, r.raw, storage);
  return r.payload.version !== version;
}

/** Product pictures that are BO files (absolute URLs), once each: what the photo warm-up downloads. */
export const remotePhotos = (book: Pick<BookData, 'products'>): string[] =>
  [...new Set(book.products.map(p => p.img).filter(img => /^https?:/i.test(img)))];
