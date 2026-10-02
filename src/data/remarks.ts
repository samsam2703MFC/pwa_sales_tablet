/**
 * Customer remarks typed by the staff on the home page, sent to the back-office
 * (POST `<API>/tablette/remarques`, contract "remarques"). A remark that cannot be sent now
 * (offline, BO down) waits on the device (localStorage `bv.remarques`) and is sent again on
 * the next start, when the network comes back, and after every new remark. Each remark has
 * its own id, so sending it twice never creates a duplicate in the BO.
 */

export type RemarkType = 'compliment' | 'suggestion' | 'reclamation';
export const REMARK_TYPES: readonly RemarkType[] = ['compliment', 'suggestion', 'reclamation'];

/** Longest remark accepted by the BO. */
export const REMARK_MAX = 1000;

/** localStorage key of the remarks waiting to be sent. */
export const REMARK_QUEUE_KEY = 'bv.remarques';

/** Gives up on one send after this long (the remark then waits on the device). */
export const REMARK_TIMEOUT_MS = 20000;

export type RemarkStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface Remark {
  id: string;
  shop: string | null;
  type: RemarkType;
  texte: string;
  langue: 'fr' | 'nl';
  saisieLe: string;
}

/** A random v4 UUID (crypto.randomUUID where available). */
export function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Local time with its offset, e.g. "2026-10-02T18:40:12+02:00". */
export function localIso(d: Date): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    + `${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}

/** The text as the BO will store it, or null when it cannot be sent (empty or too long). */
export const cleanRemark = (text: string): string | null => {
  const t = text.trim();
  return t && t.length <= REMARK_MAX ? t : null;
};

const isRemark = (v: unknown): v is Remark => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && (r.shop === null || typeof r.shop === 'string') && REMARK_TYPES.includes(r.type as RemarkType)
    && typeof r.texte === 'string' && (r.langue === 'fr' || r.langue === 'nl') && typeof r.saisieLe === 'string';
};

export function readQueue(storage: RemarkStorage | null): Remark[] {
  try {
    const v: unknown = JSON.parse(storage?.getItem(REMARK_QUEUE_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter(isRemark) : [];
  } catch {
    return [];
  }
}

function writeQueue(storage: RemarkStorage | null, queue: Remark[]): boolean {
  try {
    storage?.setItem(REMARK_QUEUE_KEY, JSON.stringify(queue));
    return !!storage;
  } catch {
    return false;
  }
}

/** 'sent': the BO has it; 'retry': keep it and try later; 'rejected': the BO refused it (400), drop it. */
export type SendResult = 'sent' | 'retry' | 'rejected';

export async function sendRemark(
  url: string,
  r: Remark,
  { fetch = globalThis.fetch, timeoutMs = REMARK_TIMEOUT_MS }: { fetch?: typeof globalThis.fetch; timeoutMs?: number } = {},
): Promise<SendResult> {
  if (typeof fetch !== 'function') return 'retry';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(r),
      signal: ctrl.signal,
    });
    if (res.ok) return 'sent';
    return res.status === 400 ? 'rejected' : 'retry';
  } catch {
    return 'retry';
  } finally {
    clearTimeout(timer);
  }
}

export const remarksUrl = (apiRoot: string): string => `${apiRoot}/tablette/remarques`;

/** Sends every waiting remark, oldest first; keeps the ones to retry. Returns how many are left. */
export async function flushQueue(url: string, storage: RemarkStorage | null, opts: Parameters<typeof sendRemark>[2] = {}): Promise<number> {
  const queue = readQueue(storage);
  const left: Remark[] = [];
  for (const r of queue) {
    if ((await sendRemark(url, r, opts)) === 'retry') left.push(r);
  }
  // Remarks added meanwhile (another send in progress) are kept too.
  const added = readQueue(storage).filter(r => !queue.some(q => q.id === r.id));
  writeQueue(storage, [...left, ...added]);
  return left.length + added.length;
}

let flushing: Promise<number> | null = null;

/**
 * Sends a new remark: at once when possible, else it waits on the device. 'queued' also when
 * the device cannot keep it (storage blocked) but the send failed — then it is lost, and the
 * caller says so ('lost').
 */
export async function submitRemark(
  url: string,
  r: Remark,
  storage: RemarkStorage | null,
  opts: Parameters<typeof sendRemark>[2] = {},
): Promise<'sent' | 'queued' | 'rejected' | 'lost'> {
  const result = await sendRemark(url, r, opts);
  if (result === 'sent') {
    if (!flushing) void (flushing = flushQueue(url, storage, opts).finally(() => { flushing = null; }));
    return 'sent';
  }
  if (result === 'rejected') return 'rejected';
  return writeQueue(storage, [...readQueue(storage), r]) ? 'queued' : 'lost';
}

/** Sends the waiting remarks now and whenever the network comes back. Returns a disposer. */
export function startRemarkSync(url: string, storage: RemarkStorage | null, target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): () => void {
  const run = () => {
    if (flushing || !readQueue(storage).length) return;
    void (flushing = flushQueue(url, storage).finally(() => { flushing = null; }));
  };
  run();
  target.addEventListener('online', run);
  return () => target.removeEventListener('online', run);
}
