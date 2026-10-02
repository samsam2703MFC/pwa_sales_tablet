import { SAMPLE_SOURCE } from './book';
import type { BookData, BookSource, Category, Diet, Product, Season, T2 } from './types';

/**
 * The book sent by the back-office (GET `<API>/tablette/book?shop=<id>`, contract
 * "tablette-contract", schema 1): checked, then merged into the bundled sample.
 *
 * The BO sends the products, their categories and the seasons; everything else (the 14 EU
 * allergens, FAQ, services, sales reflexes, statistics, onboarding) stays the bundled sample.
 * Anything unexpected (BO unreachable, no BO at all as under `vite preview`, an HTML error
 * page, another schema, no valid product) falls back to the sample: the app always starts.
 */

/** Gives up on the BO after this long (the service worker answers from its cache after 4 s). */
export const BOOK_TIMEOUT_MS = 6000;

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

/** A product row. Required: id, cat, French name, price (number or null), al, dlc (days). */
const toProduct = (v: Rec): Product => {
  const season = opt(v.season, isStr, '');
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
): Promise<{ payload: RemotePayload; fromCache: boolean } | null> {
  if (typeof fetch !== 'function') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: ctrl.signal });
    // vite preview / a static server answer the SPA's HTML or a 404 here: not a book.
    if (!res.ok || !/\bjson\b/i.test(res.headers.get('content-type') ?? '')) return null;
    const payload = parsePayload(await res.json());
    return payload && { payload, fromCache: res.headers.get(CACHE_HEADER) === '1' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface LoadOptions extends FetchOptions {
  url: string;
  sample: BookData;
  publicRoot: string;
  /** navigator.onLine: a book received while offline is shown as offline data. */
  online?: boolean;
}

/** The book to show and where it comes from: the BO book merged into the sample, else the sample. */
export async function loadBook({ url, sample, publicRoot, online = true, ...opts }: LoadOptions): Promise<{ book: BookData; source: BookSource }> {
  try {
    const r = await fetchBook(url, opts);
    if (r) {
      const { payload } = r;
      return {
        book: mergeBook(sample, payload.book, publicRoot),
        source: { kind: r.fromCache || !online ? 'cache' : 'bo', version: payload.version, generatedAt: payload.generatedAt, shop: payload.shop },
      };
    }
  } catch {
    // Never keep the app from starting: fall back to the sample.
  }
  return { book: sample, source: SAMPLE_SOURCE };
}

/**
 * Whether the BO now serves another book than `version` (null = the sample is on screen).
 * Only a fresh answer counts: the cached copy (BO unreachable) or a failure is "no change".
 */
export async function bookChanged(url: string, version: string | null, opts: FetchOptions = {}): Promise<boolean> {
  const r = await fetchBook(url, opts);
  return !!r && !r.fromCache && r.payload.version !== version;
}

/** Product pictures that are BO files (absolute URLs), once each: what the photo warm-up downloads. */
export const remotePhotos = (book: Pick<BookData, 'products'>): string[] =>
  [...new Set(book.products.map(p => p.img).filter(img => /^https?:/i.test(img)))];
