import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_BOOK as F } from '../test/fixtures';
import { REMOTE_PAYLOAD } from '../test/remoteFixture';
import { SAMPLE_BOOK, SAMPLE_SOURCE } from './book';
import { BOOK_STORE_KEY, bookUrl, CACHE_HEADER, fetchBook, mergeBook, parsePayload, readStoredBook, refreshBook, remoteImg, remotePhotos, startBook, storeBook, type BookStorage } from './remote';
import { validateBook } from './validate';

const PUB = 'http://bo.test/consulant_bo/';
const URL_ = 'http://bo.test/consulant_bo/api/cockpit/tablette/book?shop=4';

/** Deep copy of the fixture payload, with `edit` applied. */
const payload = (edit: (p: typeof REMOTE_PAYLOAD & Record<string, unknown>) => void = () => {}) => {
  const p = structuredClone(REMOTE_PAYLOAD) as typeof REMOTE_PAYLOAD & Record<string, unknown>;
  edit(p);
  return p;
};
const rawProduct = (i = 0) => structuredClone(REMOTE_PAYLOAD.book.products[i]) as Record<string, unknown>;

/** A fetch answering `body` with the given status and headers. */
const answer = (body: unknown, { status = 200, headers = { 'content-type': 'application/json; charset=utf-8' } as Record<string, string> } = {}) =>
  vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }));

describe('bookUrl', () => {
  it('asks for the shop book, or the network-wide one without a shop', () => {
    expect(bookUrl('http://h/consulant_bo/api/cockpit', '4')).toBe('http://h/consulant_bo/api/cockpit/tablette/book?shop=4');
    expect(bookUrl('/api/cockpit', null)).toBe('/api/cockpit/tablette/book');
  });
});

describe('parsePayload — structural guard', () => {
  it('accepts the BO payload', () => {
    const p = parsePayload(payload())!;
    expect(p.version).toBe('3f2a9c0d1e');
    expect(p.generatedAt).toBe('2026-10-02T09:12:00+02:00');
    expect(p.shop).toEqual({ id: '4', name: 'Ixelles' });
    expect(p.book.products.map(x => x.id)).toEqual(['1610006', '1610042', '2200310', '3300120']);
    expect(p.book.categories.map(x => x.id)).toEqual(['g-viennoiserie', 'g-pain', 'g-patisserie']);
    expect(p.book.seasons.map(x => x.id)).toEqual(['s12', 's10']);
    expect(p.book.products[0]).toMatchObject({ alKnown: false, trKnown: false, alRaw: 'Contient : gluten, lait, œuf. Traces : fruits à coque.' });
    // no season key when the BO sends none
    expect('season' in p.book.products[0]).toBe(false);
    expect(p.book.products[1].season).toBe('s10');
  });

  it.each([
    ['not an object', null],
    ['an HTML page', '<!doctype html>'],
    ['another schema', payload(p => { p.schema = 2; })],
    ['no version', payload(p => { p.version = ''; })],
    ['no book', payload(p => { delete (p as Record<string, unknown>).book; })],
    ['products not a list', payload(p => { (p.book as Record<string, unknown>).products = {}; })],
    ['no valid product', payload(p => { p.book.products = [] as never; })],
  ])('rejects %s', (_, v) => {
    expect(parsePayload(v)).toBeNull();
  });

  it.each([
    ['no id', (r: Record<string, unknown>) => { delete r.id; }],
    ['empty id', (r: Record<string, unknown>) => { r.id = ' '; }],
    ['no category', (r: Record<string, unknown>) => { r.cat = ''; }],
    ['no French name', (r: Record<string, unknown>) => { r.name = ['', 'Croissant']; }],
    ['a name that is not a pair', (r: Record<string, unknown>) => { r.name = 'Croissant'; }],
    ['no price key', (r: Record<string, unknown>) => { delete r.price; }],
    ['a price as text', (r: Record<string, unknown>) => { r.price = '1,30'; }],
    ['a negative price', (r: Record<string, unknown>) => { r.price = -1; }],
    ['no allergen list', (r: Record<string, unknown>) => { delete r.al; }],
    ['allergens as text', (r: Record<string, unknown>) => { r.al = 'gluten'; }],
    ['a shelf life in hours', (r: Record<string, unknown>) => { r.dlc = 1.5; }],
    ['no shelf life', (r: Record<string, unknown>) => { delete r.dlc; }],
    ['an unknown diet', (r: Record<string, unknown>) => { r.diet = 'halal'; }],
    ['alKnown as text', (r: Record<string, unknown>) => { r.alKnown = 'true'; }],
    ['a description with one language', (r: Record<string, unknown>) => { r.desc = ['Feuilleté']; }],
  ])('drops a product row with %s, keeps the others', (_, edit) => {
    const bad = rawProduct();
    edit(bad);
    const p = parsePayload(payload(x => { x.book.products = [bad, rawProduct(2)] as never; }))!;
    expect(p.book.products.map(x => x.id)).toEqual(['2200310']);
  });

  it('fills absent optional fields; absent alKnown / trKnown mean unverified', () => {
    const p = parsePayload(payload(x => {
      x.book.products = [{ id: '9', cat: 'g-pain', name: ['Baguette', ''], price: null, al: ['gluten'], dlc: 0 }] as never;
    }))!;
    expect(p.book.products[0]).toEqual({
      id: '9', cat: 'g-pain', img: '', price: null, unit: ['', ''], best: false, name: ['Baguette', ''],
      desc: ['', ''], pitch: ['', ''], ingr: ['', ''], al: ['gluten'], tr: [], alKnown: false, trKnown: false, alRaw: '',
      diet: null, keep: ['', ''], dlc: 0, cross: [], crossLine: ['', ''],
    });
  });

  it('drops malformed categories and seasons, and repeated ids (first one kept)', () => {
    const p = parsePayload(payload(x => {
      x.book.categories.push({ id: 'all', n: ['Tout', 'Alles'] }, { id: 'g-x', n: ['', 'X'] }, { id: 'g-pain', n: ['Doublon', ''] });
      x.book.seasons.push(
        { id: 'sx', img: '', m: [13], n: ['Mois 13', ''], dates: ['', ''], tip: ['', ''] },
        { id: 'sy', img: '', m: [], n: ['Jamais', ''], dates: ['', ''], tip: ['', ''] },
      );
      x.book.products.push(rawProduct(0) as never);
    }))!;
    expect(p.book.categories.map(c => [c.id, c.n[0]])).toEqual([['g-viennoiserie', 'Viennoiserie'], ['g-pain', 'Pain'], ['g-patisserie', 'Pâtisserie']]);
    expect(p.book.seasons.map(s => s.id)).toEqual(['s12', 's10']);
    expect(p.book.products.map(x => x.id)).toEqual(['1610006', '1610042', '2200310', '3300120']);
  });

  it('a shop id sent as a number, or no shop (network-wide book)', () => {
    expect(parsePayload(payload(x => { (x as Record<string, unknown>).shop = { id: 4, nom: 'Ixelles' }; }))!.shop).toEqual({ id: '4', name: 'Ixelles' });
    expect(parsePayload(payload(x => { (x as Record<string, unknown>).shop = null; }))!.shop).toBeNull();
  });
});

describe('mergeBook', () => {
  const merged = () => mergeBook(SAMPLE_BOOK, parsePayload(payload())!.book, PUB);

  it('takes the BO products, categories and seasons; keeps the sample allergens, FAQ, services, reflexes, stats', () => {
    const b = merged();
    expect(b.products.map(p => p.name[0])).toEqual(['Croissant au beurre AOP', 'Couque suisse aux raisins', 'Pain gris multicéréales', 'Bûche pâtissière praliné']);
    expect(b.categories.map(c => c.id)).toEqual(['g-viennoiserie', 'g-pain', 'g-patisserie']);
    expect(b.seasons.map(s => s.id)).toEqual(['s12', 's10']);
    expect(b.allergens).toBe(SAMPLE_BOOK.allergens);
    expect(b.faqCats).toBe(SAMPLE_BOOK.faqCats);
    expect(b.services).toBe(SAMPLE_BOOK.services);
    expect(b.reflexes).toBe(SAMPLE_BOOK.reflexes);
    expect(b.faq.map(f => f.q)).toEqual(SAMPLE_BOOK.faq.map(f => f.q));
    expect(b.stats.obj).toBe(SAMPLE_BOOK.stats.obj);
    expect(b.stats.sellers.map(s => s.name)).toEqual(SAMPLE_BOOK.stats.sellers.map(s => s.name));
  });

  it('drops the links to sample products: combos, FAQ products, top lists', () => {
    const b = merged();
    expect(b.combos).toEqual([]);
    expect(b.faq.every(f => !f.p?.length)).toBe(true);
    expect(b.stats.sellers.every(s => s.top.length === 0)).toBe(true);
  });

  it('keeps a combo only when all its products are known', () => {
    const remote = { categories: F.categories, seasons: F.seasons, products: F.products.filter(p => p.id !== 'p5') };
    const b = mergeBook(F, remote, PUB);
    // combo 1 lists p5 (gone) and "ghost": dropped; combo 2 has no product at all: dropped
    expect(b.combos).toEqual([]);
    expect(mergeBook({ ...F, combos: [{ n: ['A', 'A'], when: ['', ''], items: ['p1', 'p2'], price: 3 }] }, remote, PUB).combos).toHaveLength(1);
    expect(b.faq.map(f => f.p)).toEqual([['p1'], undefined, ['p3', 'p1']]);
    expect(b.stats.sellers.map(s => s.top.map(t => t[0]))).toEqual([['p1', 'p3'], ['p1', 'p2']]);
  });

  it('photos: BO files under the BO public root, bundled illustrations app-relative, else no picture', () => {
    const b = merged();
    expect(b.products.map(p => p.img)).toEqual([
      'http://bo.test/consulant_bo/uploads/tablette/1610006-640.jpg',
      'http://bo.test/consulant_bo/uploads/plano/panel/1610042.png',
      '',
      'http://bo.test/consulant_bo/uploads/tablette/3300120-640.jpg',
    ]);
    expect(b.seasons.map(s => s.img)).toEqual(['img/s/christmas-new-year-range.png', '']);
    expect(remoteImg('https://evil.test/x.png', PUB)).toBe('');
    expect(remoteImg('/etc/x.png', PUB)).toBe('');
    expect(remotePhotos(b)).toEqual([b.products[0].img, b.products[1].img, b.products[3].img]);
  });

  it('allergen safety: ids outside the 14 EU allergens make the list unverified; only an explicit true is verified', () => {
    const p = (over: Record<string, unknown>) => ({ ...parsePayload(payload())!.book.products[0], ...over });
    const run = (over: Record<string, unknown>) => mergeBook(SAMPLE_BOOK, { categories: [], seasons: [], products: [p(over) as never] }, PUB).products[0];
    expect(run({ al: ['gluten', 'lait'], alKnown: true, trKnown: true })).toMatchObject({ al: ['gluten', 'lait'], alKnown: true, trKnown: true });
    expect(run({ al: ['gluten', 'gluton'], alKnown: true })).toMatchObject({ al: ['gluten'], alKnown: false });
    expect(run({ tr: ['noix', 'nuts'], trKnown: true })).toMatchObject({ tr: ['noix'], trKnown: false });
    expect(run({ alKnown: undefined, trKnown: undefined })).toMatchObject({ alKnown: false, trKnown: false });
    // an id in both lists stays in "contains" only
    expect(run({ al: ['lait'], tr: ['lait', 'noix'], alKnown: true, trKnown: true })).toMatchObject({ al: ['lait'], tr: ['noix'] });
  });

  it('drops unknown seasons and cross-sell ids', () => {
    const p = (over: Record<string, unknown>) => ({ ...parsePayload(payload())!.book.products[0], ...over }) as never;
    const b = mergeBook(SAMPLE_BOOK, { categories: [], seasons: [], products: [p({ id: 'a', season: 's99', cross: ['b', 'zz'] }), p({ id: 'b' })] }, PUB);
    expect('season' in b.products[0]).toBe(false);
    expect(b.products[0].cross).toEqual(['b']);
  });

  it('gives a consistent book (src/data/validate.ts)', () => {
    expect(validateBook(merged())).toEqual([]);
  });
});

/** An in-memory localStorage; `failing` makes every call throw (quota, blocked storage). */
const memoryStorage = (failing = false) => {
  const m = new Map<string, string>();
  const s: BookStorage & { map: Map<string, string> } = {
    map: m,
    getItem: k => { if (failing) throw new Error('blocked'); return m.get(k) ?? null; },
    setItem: (k, v) => { if (failing) throw new Error('quota'); m.set(k, v); },
  };
  return s;
};

describe('startBook', () => {
  it('without a kept book: loads the BO book, merged into the sample, source "bo", and keeps it on the device', async () => {
    const fetch = answer(payload());
    const storage = memoryStorage();
    const r = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch, storage });
    expect(fetch).toHaveBeenCalledWith(URL_, expect.objectContaining({ headers: { Accept: 'application/json' } }));
    expect(r.source).toEqual({ kind: 'bo', version: '3f2a9c0d1e', generatedAt: '2026-10-02T09:12:00+02:00', shop: { id: '4', name: 'Ixelles' } });
    expect(r.book.products[0].name[0]).toBe('Croissant au beurre AOP');
    expect(r.refresh).toBe(false);
    expect(readStoredBook(URL_, storage)?.version).toBe('3f2a9c0d1e');
  });

  it('with a kept book for this URL: starts at once without asking the BO, then asks for a refresh', async () => {
    const storage = memoryStorage();
    storeBook(URL_, payload(), storage);
    const fetch = vi.fn();
    const r = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch, storage });
    expect(fetch).not.toHaveBeenCalled();
    expect(r.source.kind).toBe('bo');
    expect(r.source.version).toBe('3f2a9c0d1e');
    expect(r.book.products[0].name[0]).toBe('Croissant au beurre AOP');
    expect(r.refresh).toBe(true);
    // offline: the kept book is offline data, and there is nothing to refresh from
    const offline = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch, storage, online: false });
    expect(offline.source.kind).toBe('cache');
    expect(offline.refresh).toBe(false);
  });

  it('ignores a book kept for another shop, or an unusable one', async () => {
    const storage = memoryStorage();
    storeBook(URL_.replace('shop=4', 'shop=5'), payload(), storage);
    expect(readStoredBook(URL_, storage)).toBeNull();
    storage.map.set(BOOK_STORE_KEY, '{not json');
    expect(readStoredBook(URL_, storage)).toBeNull();
    storage.map.set(BOOK_STORE_KEY, JSON.stringify({ url: URL_, payload: payload(p => { p.schema = 2; }) }));
    expect(readStoredBook(URL_, storage)).toBeNull();
    const r = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch: answer(payload()), storage });
    expect(r.source.kind).toBe('bo');
  });

  it('storage errors never stop the app: it simply waits for the BO', async () => {
    const r = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch: answer(payload()), storage: memoryStorage(true) });
    expect(r.source.kind).toBe('bo');
    expect(readStoredBook(URL_, null)).toBeNull();
  });

  it('a book the service worker served from its cache, or received offline, is offline data (not kept)', async () => {
    const storage = memoryStorage();
    const cached = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, storage, fetch: answer(payload(), { headers: { 'content-type': 'application/json', [CACHE_HEADER]: '1' } }) });
    expect(cached.source.kind).toBe('cache');
    expect(cached.refresh).toBe(true);
    expect(readStoredBook(URL_, storage)).toBeNull();
    const offline = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch: answer(payload()), online: false });
    expect(offline.source.kind).toBe('cache');
  });

  it.each([
    ['the SPA page (vite preview)', answer('<!doctype html><title>x</title>', { headers: { 'content-type': 'text/html' } })],
    ['a 404', answer({ erreur: 'introuvable' }, { status: 404 })],
    ['a BO error', answer({ erreur: 'panne' }, { status: 500 })],
    ['invalid JSON', answer('{"schema":1,', { headers: { 'content-type': 'application/json' } })],
    ['a network error', vi.fn(async () => { throw new TypeError('Failed to fetch'); })],
    ['another schema', answer(payload(p => { p.schema = 2; }))],
  ])('falls back to the sample on %s, and asks for a refresh', async (_, fetch) => {
    const r = await startBook({ url: URL_, sample: SAMPLE_BOOK, publicRoot: PUB, fetch: fetch as unknown as typeof globalThis.fetch });
    expect(r.book).toBe(SAMPLE_BOOK);
    expect(r.source).toBe(SAMPLE_SOURCE);
    expect(r.refresh).toBe(true);
  });

  it('fetchBook gives up after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }));
      const pending = fetchBook(URL_, { fetch: fetch as unknown as typeof globalThis.fetch, timeoutMs: 6000 });
      await vi.advanceTimersByTimeAsync(5999);
      expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('refreshBook', () => {
  it('true only for a fresh BO answer with another version, which it keeps on the device', async () => {
    const storage = memoryStorage();
    expect(await refreshBook(URL_, '3f2a9c0d1e', storage, { fetch: answer(payload()) })).toBe(false);
    expect(await refreshBook(URL_, 'old', storage, { fetch: answer(payload()) })).toBe(true);
    expect(readStoredBook(URL_, storage)?.version).toBe('3f2a9c0d1e');
    // the sample was on screen: the BO came back
    expect(await refreshBook(URL_, null, storage, { fetch: answer(payload()) })).toBe(true);
    // the cached copy (BO unreachable) or a failure is "no change", and nothing is kept
    const other = memoryStorage();
    expect(await refreshBook(URL_, 'old', other, { fetch: answer(payload(), { headers: { 'content-type': 'application/json', [CACHE_HEADER]: '1' } }) })).toBe(false);
    expect(await refreshBook(URL_, 'old', other, { fetch: answer('nope', { status: 503 }) })).toBe(false);
    expect(readStoredBook(URL_, other)).toBeNull();
  });
});
