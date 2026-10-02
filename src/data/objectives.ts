/**
 * The shop's targets shown on the home page: revenue (CA) and cross-sell ("vente
 * additionnelle"), for the current week and month, from the back-office
 * (GET `<API>/tablette/objectifs?shop=<id>`, contract "objectifs", schema 1).
 *
 * The last answer is kept on the device (localStorage `bv.obj`) so the home page shows it at
 * once and without network; it is refreshed when the home page opens (at most every few
 * minutes). Nothing is invented: a field the BO does not know stays null and is shown as such.
 */

/** Gives up on the BO after this long (the home page shows the kept copy meanwhile). */
export const OBJ_TIMEOUT_MS = 20000;

/** A kept copy younger than this is not asked again when the home page opens. */
export const OBJ_FRESH_MS = 5 * 60 * 1000;

/** localStorage key of the last answer (see `readStoredObjectives`). */
export const OBJ_STORE_KEY = 'bv.obj';

export type ObjStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Revenue of a period: realised so far, target of the whole period, share expected by today. */
export interface CaPeriod {
  /** First and last day of the period (YYYY-MM-DD). */
  from: string;
  to: string;
  done: number | null;
  target: number | null;
  expected: number | null;
}

/**
 * Cross-sell of a period, measured as items (lines) per ticket — the BO's "Ventes › primes"
 * measure — with the shop's target and the ticket base.
 */
export interface CrossPeriod {
  perTicket: number | null;
  target: number | null;
  tickets: number | null;
}

export interface Objectives {
  /** Reference day (YYYY-MM-DD). */
  date: string;
  generatedAt: string | null;
  shop: { id: string; name: string } | null;
  ca: { week: CaPeriod; month: CaPeriod };
  cross: { week: CrossPeriod; month: CrossPeriod };
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pos = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 0 ? n : null;
};
const day = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

const caPeriod = (v: unknown): CaPeriod | null => {
  if (!isRec(v)) return null;
  const from = day(v.du), to = day(v.au);
  if (!from || !to) return null;
  // A target of 0 means "no target" for a gauge.
  const target = pos(v.objectif);
  return { from, to, done: pos(v.realise), target: target ? target : null, expected: pos(v.attendu) };
};

const crossPeriod = (v: unknown): CrossPeriod => {
  const r = isRec(v) ? v : {};
  const target = pos(r.cible);
  return { perTicket: pos(r.parTicket), target: target ? target : null, tickets: pos(r.tickets) };
};

/** Checks the BO answer; null when it is unusable (not schema 1, no date, no CA periods). */
export function parseObjectives(v: unknown): Objectives | null {
  if (!isRec(v) || v.schema !== 1) return null;
  const date = day(v.date);
  if (!date || !isRec(v.ca)) return null;
  const week = caPeriod(v.ca.semaine), month = caPeriod(v.ca.mois);
  if (!week || !month) return null;
  const va = isRec(v.venteAdd) ? v.venteAdd : {};
  const shop = isRec(v.shop) && (typeof v.shop.id === 'string' || typeof v.shop.id === 'number') && typeof v.shop.nom === 'string'
    ? { id: String(v.shop.id), name: v.shop.nom }
    : null;
  return {
    date,
    generatedAt: typeof v.genereLe === 'string' && v.genereLe ? v.genereLe : null,
    shop,
    ca: { week, month },
    cross: { week: crossPeriod(va.semaine), month: crossPeriod(va.mois) },
  };
}

export const objectivesUrl = (apiRoot: string, shop: string | null): string =>
  `${apiRoot}/tablette/objectifs${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`;

/** The kept answer for this URL, with when it was received; null if none or unusable. */
export function readStoredObjectives(url: string, storage: ObjStorage | null): { obj: Objectives; at: number } | null {
  try {
    const s: unknown = JSON.parse(storage?.getItem(OBJ_STORE_KEY) ?? 'null');
    if (!isRec(s) || s.url !== url || typeof s.at !== 'number') return null;
    const obj = parseObjectives(s.payload);
    return obj && { obj, at: s.at };
  } catch {
    return null;
  }
}

/** Asks the BO; keeps a usable answer on the device. Null on any failure (never throws). */
export async function fetchObjectives(
  url: string,
  storage: ObjStorage | null,
  { fetch = globalThis.fetch, timeoutMs = OBJ_TIMEOUT_MS, now = Date.now }: { fetch?: typeof globalThis.fetch; timeoutMs?: number; now?: () => number } = {},
): Promise<Objectives | null> {
  if (typeof fetch !== 'function') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: ctrl.signal });
    if (!res.ok || !/\bjson\b/i.test(res.headers.get('content-type') ?? '')) return null;
    const raw: unknown = await res.json();
    const obj = parseObjectives(raw);
    if (obj) {
      try {
        storage?.setItem(OBJ_STORE_KEY, JSON.stringify({ url, at: now(), payload: raw }));
      } catch {
        // Quota or storage blocked: shown now, simply not kept.
      }
    }
    return obj;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- Gauges --------------------------------------------------------------------------------

export type GaugeState = 'reached' | 'ahead' | 'behind' | 'toGo' | 'none';

export interface GaugeVM {
  /** Bar fill, 0–100 (% of the target). */
  fill: number;
  /** Where today's expected value sits on the bar (0–100), null when unknown. */
  mark: number | null;
  state: GaugeState;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Revenue gauge: done vs target, with the "expected by today" mark when known. */
export function caGauge(p: CaPeriod): GaugeVM {
  if (p.done === null || p.target === null) return { fill: 0, mark: null, state: 'none' };
  const fill = clamp((100 * p.done) / p.target);
  const mark = p.expected === null ? null : clamp((100 * p.expected) / p.target);
  const state: GaugeState = p.done >= p.target ? 'reached' : p.expected === null ? 'toGo' : p.done >= p.expected ? 'ahead' : 'behind';
  return { fill, mark, state };
}

/** Cross-sell gauge: items per ticket vs its target (an average, so no "expected by today"). */
export function crossGauge(p: CrossPeriod): GaugeVM {
  if (p.perTicket === null || p.target === null) return { fill: 0, mark: null, state: 'none' };
  return { fill: clamp((100 * p.perTicket) / p.target), mark: null, state: p.perTicket >= p.target ? 'reached' : 'toGo' };
}
