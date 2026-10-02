import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanRemark, flushQueue, localIso, readQueue, REMARK_MAX, REMARK_QUEUE_KEY, remarksUrl, sendRemark, startRemarkSync,
  submitRemark, uuid, type Remark, type RemarkStorage,
} from './remarks';

const URL_ = 'http://bo.test/consulant_bo/api/cockpit/tablette/remarques';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let n = 0;
const remark = (over: Partial<Remark> = {}): Remark => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  shop: '4', type: 'compliment', texte: 'Le pain aux noix est excellent.', langue: 'fr', saisieLe: '2026-10-02T18:40:12+02:00',
  ...over,
});

/** In-memory Storage; `fail` makes the calls throw (private mode, blocked site data, quota). */
const memory = (queue?: unknown, fail: { get?: boolean; set?: boolean } = {}) => {
  const data = new Map<string, string>(queue === undefined ? [] : [[REMARK_QUEUE_KEY, typeof queue === 'string' ? queue : JSON.stringify(queue)]]);
  const s: RemarkStorage & { queue: () => Remark[] } = {
    getItem: k => {
      if (fail.get) throw new Error('blocked');
      return data.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (fail.set) throw new Error('quota');
      data.set(k, v);
    },
    queue: () => JSON.parse(data.get(REMARK_QUEUE_KEY) ?? '[]'),
  };
  return s;
};

const status = (code: number, body: unknown = code < 300 ? { ok: true } : { erreur: 'x' }) =>
  new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });

/** A fetch answering each remark by its id: `answers[id]` (a status code, or 'down' for a network error). */
const bo = (answers: Record<string, number | 'down'> = {}, fallback: number | 'down' = 201) => {
  const sent: Remark[] = [];
  const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const r = JSON.parse(String(init?.body)) as Remark;
    const a = answers[r.id] ?? fallback;
    if (a === 'down') throw new TypeError('Failed to fetch');
    if (a < 300) sent.push(r);
    return status(a);
  });
  return { fetch, sent };
};

/** Lets pending promise callbacks run (a send in progress ends). */
const settle = () => new Promise(r => setTimeout(r, 0));

afterEach(async () => {
  // A background send started by a test (submitRemark after a success) ends before the next one.
  await settle();
  vi.unstubAllGlobals();
});

describe('cleanRemark', () => {
  it('trims the text; empty or too long cannot be sent', () => {
    expect(cleanRemark('  Trop cuit.  \n')).toBe('Trop cuit.');
    expect(cleanRemark('')).toBeNull();
    expect(cleanRemark(' \n\t ')).toBeNull();
    expect(cleanRemark('x'.repeat(REMARK_MAX))).toHaveLength(REMARK_MAX);
    expect(cleanRemark('x'.repeat(REMARK_MAX + 1))).toBeNull();
    // The limit applies to what is sent (after trimming).
    expect(cleanRemark(`  ${'x'.repeat(REMARK_MAX)}  `)).toHaveLength(REMARK_MAX);
  });
});

describe('uuid', () => {
  it('is a random v4 UUID (the BO deduplicates on it)', () => {
    const ids = Array.from({ length: 50 }, uuid);
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(50);
  });

  it('without crypto.randomUUID (older Safari, http): built from getRandomValues', () => {
    vi.stubGlobal('crypto', { getRandomValues: (b: Uint8Array) => b.fill(0xff) });
    expect(uuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('without crypto at all: still a v4 UUID', () => {
    vi.stubGlobal('crypto', undefined);
    expect(uuid()).toMatch(UUID_V4);
  });
});

describe('localIso', () => {
  it('local time with the device offset, to the second (contract "saisieLe")', () => {
    const d = new Date(2026, 9, 2, 18, 40, 12, 345);
    const s = localIso(d);
    expect(s).toMatch(/^2026-10-02T18:40:12[+-]\d\d:\d\d$/);
    expect(new Date(s).getTime()).toBe(new Date(2026, 9, 2, 18, 40, 12).getTime());
  });
});

describe('readQueue', () => {
  it('reads the waiting remarks', () => {
    const q = [remark(), remark({ type: 'reclamation', langue: 'nl', shop: null })];
    expect(readQueue(memory(q))).toEqual(q);
  });

  it('never throws: no storage, nothing kept, garbage, not a list, blocked storage', () => {
    expect(readQueue(null)).toEqual([]);
    expect(readQueue(memory())).toEqual([]);
    expect(readQueue(memory('{oops'))).toEqual([]);
    expect(readQueue(memory({ id: 'x' }))).toEqual([]);
    expect(readQueue(memory('null'))).toEqual([]);
    expect(readQueue(memory([remark()], { get: true }))).toEqual([]);
  });

  it('drops malformed entries and keeps the others', () => {
    const ok = remark();
    const bad = [
      null, 'x', 42,
      { ...remark(), id: 7 },
      { ...remark(), type: 'insulte' },
      { ...remark(), texte: null },
      { ...remark(), langue: 'en' },
      { ...remark(), shop: 4 },
      { ...remark(), saisieLe: undefined },
    ];
    expect(readQueue(memory([...bad, ok]))).toEqual([ok]);
  });
});

describe('sendRemark', () => {
  it('POSTs the remark as JSON (contract fields only) to the BO', async () => {
    const r = remark();
    const { fetch } = bo();
    await expect(sendRemark(URL_, r, { fetch })).resolves.toBe('sent');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(URL_);
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
    expect(JSON.parse(String(init?.body))).toEqual({
      id: r.id, shop: '4', type: 'compliment', texte: 'Le pain aux noix est excellent.', langue: 'fr', saisieLe: '2026-10-02T18:40:12+02:00',
    });
  });

  it('2xx (201 created, 200 already received): sent', async () => {
    for (const code of [200, 201, 204]) {
      await expect(sendRemark(URL_, remark(), { fetch: async () => (code === 204 ? new Response(null, { status: 204 }) : status(code)) })).resolves.toBe('sent');
    }
  });

  it('400: rejected by the BO (never retried)', async () => {
    await expect(sendRemark(URL_, remark(), { fetch: async () => status(400) })).resolves.toBe('rejected');
  });

  it('429, 5xx, other errors, network failure: retry later', async () => {
    for (const code of [401, 404, 429, 500, 502, 503]) {
      await expect(sendRemark(URL_, remark(), { fetch: async () => status(code) })).resolves.toBe('retry');
    }
    await expect(sendRemark(URL_, remark(), { fetch: async () => { throw new TypeError('Failed to fetch'); } })).resolves.toBe('retry');
  });

  it('gives up after the timeout: retry later', async () => {
    let signal: AbortSignal | undefined;
    const fetch = (_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      signal = init?.signal ?? undefined;
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    await expect(sendRemark(URL_, remark(), { fetch, timeoutMs: 5 })).resolves.toBe('retry');
    expect(signal?.aborted).toBe(true);
  });

  it('without fetch: retry later', async () => {
    vi.stubGlobal('fetch', undefined);
    await expect(sendRemark(URL_, remark())).resolves.toBe('retry');
  });
});

describe('remarksUrl', () => {
  it('next to the book: <API>/tablette/remarques', () => {
    expect(remarksUrl('http://bo.test/consulant_bo/api/cockpit')).toBe(URL_);
  });
});

describe('flushQueue', () => {
  it('sends the waiting remarks oldest first; keeps only those to retry', async () => {
    const [a, b, c, d] = [remark(), remark(), remark(), remark()];
    const storage = memory([a, b, c, d]);
    const { fetch, sent } = bo({ [b.id]: 503, [c.id]: 400, [d.id]: 'down' });
    await expect(flushQueue(URL_, storage, { fetch })).resolves.toBe(2);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).id)).toEqual([a.id, b.id, c.id, d.id]);
    expect(sent).toEqual([a]);
    // b (BO down) and d (offline) wait; c (refused by the BO) is dropped.
    expect(storage.queue()).toEqual([b, d]);
  });

  it('nothing waiting: no request', async () => {
    const { fetch } = bo();
    await expect(flushQueue(URL_, memory(), { fetch })).resolves.toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the remarks added while it was sending', async () => {
    const [a, b] = [remark(), remark()];
    const added = remark({ texte: 'Ajoutée pendant l\'envoi.' });
    const storage = memory([a, b]);
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const id = JSON.parse(String(init?.body)).id;
      // A new remark is queued (send failed) while the first one is on its way.
      if (id === a.id) storage.setItem(REMARK_QUEUE_KEY, JSON.stringify([...readQueue(storage), added]));
      return status(id === b.id ? 500 : 201);
    });
    await expect(flushQueue(URL_, storage, { fetch })).resolves.toBe(2);
    expect(storage.queue()).toEqual([b, added]);
  });
});

describe('submitRemark', () => {
  it('sent at once: nothing kept on the device', async () => {
    const storage = memory();
    const { fetch, sent } = bo();
    const r = remark();
    await expect(submitRemark(URL_, r, storage, { fetch })).resolves.toBe('sent');
    expect(sent).toEqual([r]);
    await vi.waitFor(() => expect(storage.queue()).toEqual([]));
  });

  it('once one is sent, the remarks still waiting leave too', async () => {
    const waiting = [remark(), remark()];
    const storage = memory(waiting);
    const { fetch, sent } = bo();
    const r = remark();
    await expect(submitRemark(URL_, r, storage, { fetch })).resolves.toBe('sent');
    await vi.waitFor(() => expect(sent).toEqual([r, ...waiting]));
    await vi.waitFor(() => expect(storage.queue()).toEqual([]));
  });

  it('offline or BO down: queued on the device, after the ones already waiting', async () => {
    const before = remark();
    const storage = memory([before]);
    const r = remark();
    await expect(submitRemark(URL_, r, storage, { fetch: async () => { throw new TypeError('offline'); } })).resolves.toBe('queued');
    await expect(submitRemark(URL_, remark(), storage, { fetch: async () => status(503) })).resolves.toBe('queued');
    expect(storage.queue().slice(0, 2)).toEqual([before, r]);
    expect(storage.queue()).toHaveLength(3);
  });

  it('refused by the BO (400): rejected, not kept', async () => {
    const storage = memory();
    await expect(submitRemark(URL_, remark(), storage, { fetch: async () => status(400) })).resolves.toBe('rejected');
    expect(storage.queue()).toEqual([]);
  });

  it('not sent and the device cannot keep it: lost (the form says so)', async () => {
    const down = async () => { throw new TypeError('offline'); };
    await expect(submitRemark(URL_, remark(), memory(undefined, { set: true }), { fetch: down })).resolves.toBe('lost');
    await expect(submitRemark(URL_, remark(), null, { fetch: down })).resolves.toBe('lost');
  });
});

describe('startRemarkSync', () => {
  it('sends the waiting remarks at start and each time the network comes back; the disposer stops it', async () => {
    const target = new EventTarget();
    const a = remark();
    const storage = memory([a]);
    const answers: Record<string, number | 'down'> = { [a.id]: 'down' };
    const { fetch, sent } = bo(answers);
    vi.stubGlobal('fetch', fetch);

    const stop = startRemarkSync(URL_, storage, target);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await settle(); // that first attempt is over
    expect(storage.queue()).toEqual([a]); // still offline: kept

    answers[a.id] = 201;
    target.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(sent).toEqual([a]));
    await vi.waitFor(() => expect(storage.queue()).toEqual([]));

    // Nothing waiting: the network coming back sends nothing.
    await settle();
    target.dispatchEvent(new Event('online'));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);

    stop();
    storage.setItem(REMARK_QUEUE_KEY, JSON.stringify([remark()]));
    target.dispatchEvent(new Event('online'));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
