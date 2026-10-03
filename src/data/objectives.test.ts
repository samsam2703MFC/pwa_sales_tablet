import { describe, expect, it, vi } from 'vitest';
import { OBJECTIVES_PAYLOAD as P } from '../test/objectivesFixture';
import {
  caGauge, crossGauge, fetchObjectives, OBJ_STORE_KEY, objectivesUrl, parseObjectives, readStoredObjectives,
  type CaPeriod, type ObjStorage,
} from './objectives';

/** In-memory Storage; `fail` makes every call throw (private mode, blocked site data, quota). */
const memory = (init: Record<string, string> = {}, fail: { get?: boolean; set?: boolean } = {}) => {
  const data = new Map(Object.entries(init));
  const s: ObjStorage & { data: Map<string, string> } = {
    data,
    getItem: k => {
      if (fail.get) throw new Error('blocked');
      return data.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (fail.set) throw new Error('quota');
      data.set(k, v);
    },
  };
  return s;
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' }, ...init });

/** Untyped JSON, as the BO may send anything. */
type Loose = Record<string, any>;

/** A deep copy of the fixture with some changes. */
const payload = (edit: (p: Loose) => void = () => {}): Loose => {
  const p: Loose = structuredClone(P);
  edit(p);
  return p;
};

const URL_ = 'http://bo.test/consulant_bo/api/cockpit/tablette/objectifs?shop=4';

describe('parseObjectives', () => {
  it('reads the BO answer (schema 1)', () => {
    expect(parseObjectives(P)).toEqual({
      date: '2026-10-02',
      generatedAt: '2026-10-02T20:15:00+02:00',
      shop: { id: '4', name: 'Ixelles' },
      ca: {
        week: { from: '2026-09-28', to: '2026-10-04', done: 4310.5, target: 6000, expected: 3420 },
        month: { from: '2026-10-01', to: '2026-10-31', done: 812.4, target: 25000, expected: 1650 },
      },
      cross: {
        week: { perTicket: 1.82, target: 2, tickets: 452 },
        month: { perTicket: 2.05, target: 2, tickets: 1890 },
      },
    });
  });

  it('rejects an unusable answer: not an object, other schema, no date, no revenue periods', () => {
    for (const bad of [null, undefined, 'x', 42, [], {}]) expect(parseObjectives(bad)).toBeNull();
    expect(parseObjectives(payload(p => { p.schema = 2; }))).toBeNull();
    expect(parseObjectives(payload(p => { p.schema = '1'; }))).toBeNull();
    expect(parseObjectives(payload(p => { delete p.date; }))).toBeNull();
    expect(parseObjectives(payload(p => { p.date = '02/10/2026'; }))).toBeNull();
    expect(parseObjectives(payload(p => { delete p.ca; }))).toBeNull();
    expect(parseObjectives(payload(p => { p.ca = []; }))).toBeNull();
    expect(parseObjectives(payload(p => { delete p.ca.mois; }))).toBeNull();
    expect(parseObjectives(payload(p => { p.ca.semaine.du = null; }))).toBeNull();
    expect(parseObjectives(payload(p => { p.ca.mois.au = '2026-10'; }))).toBeNull();
  });

  it('never invents a figure: unknown, malformed or negative values are null', () => {
    const o = parseObjectives(payload(p => {
      p.ca.semaine = { du: '2026-09-28', au: '2026-10-04', realise: null, objectif: '6000', attendu: -1 };
      p.ca.mois.realise = Number.NaN;
      p.ca.mois.attendu = Infinity;
    }))!;
    expect(o.ca.week).toEqual({ from: '2026-09-28', to: '2026-10-04', done: null, target: null, expected: null });
    expect(o.ca.month).toMatchObject({ done: null, target: 25000, expected: null });
  });

  it('a target of 0 means "no target"', () => {
    const o = parseObjectives(payload(p => {
      p.ca.semaine.objectif = 0;
      p.venteAdd.mois.cible = 0;
    }))!;
    expect(o.ca.week.target).toBeNull();
    expect(o.cross.month.target).toBeNull();
  });

  it('cross-sell (items per ticket): malformed or negative values are null, a missing block gives an empty period', () => {
    const o = parseObjectives(payload(p => {
      p.venteAdd.semaine = { parTicket: '1.8', cible: -2, tickets: 'many' };
      delete p.venteAdd.mois;
    }))!;
    const empty = { perTicket: null, target: null, tickets: null };
    expect(o.cross.week).toEqual(empty);
    expect(o.cross.month).toEqual(empty);
    expect(parseObjectives(payload(p => { delete p.venteAdd; }))!.cross).toEqual({ week: empty, month: empty });
    expect(parseObjectives(payload(p => { p.venteAdd = 'x'; }))!.cross.week.perTicket).toBeNull();
    // The former "taux" (%) shape is not read as items per ticket.
    expect(parseObjectives(payload(p => { p.venteAdd.semaine = { taux: 31.5, cible: 35, tickets: 452 }; }))!.cross.week)
      .toEqual({ perTicket: null, target: 35, tickets: 452 });
  });

  it('cross-sell: an average, not a percentage — no 0–100 cap', () => {
    const o = parseObjectives(payload(p => { p.venteAdd.mois = { parTicket: 104.5, cible: 150, tickets: 3 }; }))!;
    expect(o.cross.month).toEqual({ perTicket: 104.5, target: 150, tickets: 3 });
  });

  it('shop and generation time: optional, a numeric shop id becomes a string', () => {
    expect(parseObjectives(payload(p => { p.shop = { id: 4, nom: 'Halle' }; }))!.shop).toEqual({ id: '4', name: 'Halle' });
    expect(parseObjectives(payload(p => { p.shop = null; }))!.shop).toBeNull();
    expect(parseObjectives(payload(p => { p.shop = { id: '4' }; }))!.shop).toBeNull();
    expect(parseObjectives(payload(p => { p.genereLe = ''; }))!.generatedAt).toBeNull();
    expect(parseObjectives(payload(p => { delete p.genereLe; }))!.generatedAt).toBeNull();
  });
});

describe('objectivesUrl', () => {
  it('next to the book: <API>/tablette/objectifs, with the shop when there is one', () => {
    expect(objectivesUrl('http://bo.test/consulant_bo/api/cockpit', '4')).toBe(URL_);
    expect(objectivesUrl('/api/cockpit', null)).toBe('/api/cockpit/tablette/objectifs');
    expect(objectivesUrl('/api/cockpit', 'a b')).toBe('/api/cockpit/tablette/objectifs?shop=a%20b');
  });
});

describe('caGauge', () => {
  const p = (done: number | null, target: number | null, expected: number | null): CaPeriod => ({ from: '2026-10-01', to: '2026-10-31', done, target, expected });

  it('ahead of plan: done ≥ expected by today, the mark where today is expected', () => {
    expect(caGauge(p(4310.5, 6000, 3420))).toEqual({ fill: (100 * 4310.5) / 6000, mark: 57, state: 'ahead' });
    expect(caGauge(p(3420, 6000, 3420)).state).toBe('ahead');
  });

  it('behind plan: done < expected by today', () => {
    expect(caGauge(p(812.4, 25000, 1650))).toEqual({ fill: (100 * 812.4) / 25000, mark: (100 * 1650) / 25000, state: 'behind' });
  });

  it('reached: done ≥ target, whatever was expected; the bar never overflows', () => {
    expect(caGauge(p(6000, 6000, 6000))).toEqual({ fill: 100, mark: 100, state: 'reached' });
    expect(caGauge(p(7500, 6000, null))).toEqual({ fill: 100, mark: null, state: 'reached' });
    expect(caGauge(p(7500, 6000, 9000))).toMatchObject({ mark: 100, state: 'reached' });
  });

  it('to go: no expected value known (no mark)', () => {
    expect(caGauge(p(1500, 6000, null))).toEqual({ fill: 25, mark: null, state: 'toGo' });
  });

  it('none: no figure or no target', () => {
    const none = { fill: 0, mark: null, state: 'none' };
    expect(caGauge(p(null, 6000, 3000))).toEqual(none);
    expect(caGauge(p(1500, null, 3000))).toEqual(none);
    expect(caGauge(p(null, null, null))).toEqual(none);
  });
});

describe('crossGauge', () => {
  it('items per ticket against the target: reached or still to reach, never a mark', () => {
    expect(crossGauge({ perTicket: 1.5, target: 2, tickets: 452 })).toEqual({ fill: 75, mark: null, state: 'toGo' });
    expect(crossGauge({ perTicket: 1.82, target: 2, tickets: 452 })).toMatchObject({ mark: null, state: 'toGo' });
    expect(crossGauge({ perTicket: 1.82, target: 2, tickets: 452 }).fill).toBeCloseTo(91);
    expect(crossGauge({ perTicket: 2, target: 2, tickets: 1 })).toEqual({ fill: 100, mark: null, state: 'reached' });
    expect(crossGauge({ perTicket: 3.1, target: 2, tickets: null })).toEqual({ fill: 100, mark: null, state: 'reached' });
    expect(crossGauge({ perTicket: 0, target: 2, tickets: 0 })).toEqual({ fill: 0, mark: null, state: 'toGo' });
  });

  it('none without a figure or a target', () => {
    expect(crossGauge({ perTicket: null, target: 2, tickets: 10 }).state).toBe('none');
    expect(crossGauge({ perTicket: 1.8, target: null, tickets: 10 })).toEqual({ fill: 0, mark: null, state: 'none' });
  });
});

describe('fetchObjectives and the copy kept on the device', () => {
  it('asks the BO for JSON and keeps the raw answer for this URL, with when it came', async () => {
    const fetch = vi.fn(async () => json(P));
    const storage = memory();
    const o = await fetchObjectives(URL_, storage, { fetch, now: () => 1234 });
    expect(o).toEqual(parseObjectives(P));
    expect(fetch).toHaveBeenCalledWith(URL_, expect.objectContaining({ headers: { Accept: 'application/json' }, credentials: 'same-origin' }));
    expect(JSON.parse(storage.data.get(OBJ_STORE_KEY)!)).toEqual({ url: URL_, at: 1234, payload: P });
    expect(readStoredObjectives(URL_, storage)).toEqual({ obj: o, at: 1234 });
  });

  it('the kept copy only serves the same URL (another shop, the network-wide targets)', async () => {
    const storage = memory();
    await fetchObjectives(URL_, storage, { fetch: async () => json(P), now: () => 1 });
    expect(readStoredObjectives(URL_.replace('shop=4', 'shop=5'), storage)).toBeNull();
    expect(readStoredObjectives(URL_.replace('?shop=4', ''), storage)).toBeNull();
  });

  it('reading the kept copy never throws: nothing kept, garbage, old shape, blocked storage', () => {
    expect(readStoredObjectives(URL_, null)).toBeNull();
    expect(readStoredObjectives(URL_, memory())).toBeNull();
    expect(readStoredObjectives(URL_, memory({ [OBJ_STORE_KEY]: '{not json' }))).toBeNull();
    expect(readStoredObjectives(URL_, memory({ [OBJ_STORE_KEY]: '[]' }))).toBeNull();
    expect(readStoredObjectives(URL_, memory({ [OBJ_STORE_KEY]: JSON.stringify({ url: URL_, at: '1', payload: P }) }))).toBeNull();
    expect(readStoredObjectives(URL_, memory({ [OBJ_STORE_KEY]: JSON.stringify({ url: URL_, at: 1, payload: { schema: 2 } }) }))).toBeNull();
    expect(readStoredObjectives(URL_, memory({ [OBJ_STORE_KEY]: JSON.stringify({ url: URL_, at: 1, payload: P }) }, { get: true }))).toBeNull();
  });

  it('failures give null and keep the previous copy: HTTP error, not JSON, unusable answer, network', async () => {
    const kept = JSON.stringify({ url: URL_, at: 1, payload: P });
    const cases: (() => Promise<Response>)[] = [
      async () => json({ erreur: 'panne' }, { status: 500 }),
      async () => new Response('<html>login</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      async () => new Response(JSON.stringify(P), { status: 200 }), // no content type
      async () => json({ schema: 2 }),
      async () => new Response('{oops', { status: 200, headers: { 'content-type': 'application/json' } }),
      async () => { throw new TypeError('Failed to fetch'); },
    ];
    for (const fetch of cases) {
      const storage = memory({ [OBJ_STORE_KEY]: kept });
      await expect(fetchObjectives(URL_, storage, { fetch })).resolves.toBeNull();
      expect(storage.data.get(OBJ_STORE_KEY)).toBe(kept);
    }
  });

  it('gives up after the timeout (aborts the request)', async () => {
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      signal = init?.signal ?? undefined;
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(fetchObjectives(URL_, memory(), { fetch, timeoutMs: 5 })).resolves.toBeNull();
    expect(signal?.aborted).toBe(true);
  });

  it('shows a good answer even when the device cannot keep it', async () => {
    const storage = memory({}, { set: true });
    await expect(fetchObjectives(URL_, storage, { fetch: async () => json(P) })).resolves.toEqual(parseObjectives(P));
    await expect(fetchObjectives(URL_, null, { fetch: async () => json(P) })).resolves.toEqual(parseObjectives(P));
  });

  it('without fetch (very old browser): null', async () => {
    vi.stubGlobal('fetch', undefined);
    try {
      await expect(fetchObjectives(URL_, memory())).resolves.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
