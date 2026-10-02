import { describe, expect, it } from 'vitest';
import { readConfig, readShop, SHOP_KEY, type ShopStorage } from './config';

describe('readConfig — language', () => {
  it('defaults to French', () => {
    expect(readConfig('', {}).defaultLang).toBe(0);
  });

  it('reads VITE_DEFAULT_LANG, and ?lang= wins over it (case-insensitive)', () => {
    expect(readConfig('', { VITE_DEFAULT_LANG: 'NL' }).defaultLang).toBe(1);
    expect(readConfig('?lang=nl', {}).defaultLang).toBe(1);
    expect(readConfig('?lang=NL', { VITE_DEFAULT_LANG: 'FR' }).defaultLang).toBe(1);
    expect(readConfig('?lang=fr', { VITE_DEFAULT_LANG: 'NL' }).defaultLang).toBe(0);
  });

  it('ignores an unknown language: env first, then French', () => {
    expect(readConfig('?lang=de', { VITE_DEFAULT_LANG: 'nl' }).defaultLang).toBe(1);
    expect(readConfig('?lang=de', { VITE_DEFAULT_LANG: 'en' }).defaultLang).toBe(0);
    expect(readConfig('?lang=', {}).defaultLang).toBe(0);
  });
});

describe('readConfig — prices', () => {
  it('shows prices by default', () => {
    expect(readConfig('', {}).showPrices).toBe(true);
  });

  it.each(['0', 'false', 'no', 'off', 'OFF'])('?prices=%s hides them', v => {
    expect(readConfig(`?prices=${v}`, { VITE_SHOW_PRICES: 'true' }).showPrices).toBe(false);
  });

  it('reads VITE_SHOW_PRICES, and ?prices= wins over it', () => {
    expect(readConfig('', { VITE_SHOW_PRICES: 'false' }).showPrices).toBe(false);
    expect(readConfig('?prices=1', { VITE_SHOW_PRICES: 'false' }).showPrices).toBe(true);
  });

  it('an empty value falls back to the env, then to true', () => {
    expect(readConfig('?prices=', { VITE_SHOW_PRICES: 'off' }).showPrices).toBe(false);
    expect(readConfig('?prices=', { VITE_SHOW_PRICES: '' }).showPrices).toBe(true);
  });
});

describe('readConfig — pinned date', () => {
  it('uses the device clock without ?date=', () => {
    expect(readConfig('', {}).date).toBeNull();
    expect(readConfig('?date=', {}).date).toBeNull();
  });

  it('pins a valid day at local noon', () => {
    expect(readConfig('?date=2026-12-15', {}).date).toEqual(new Date(2026, 11, 15, 12));
    expect(readConfig('?date=2026-01-01', {}).date).toEqual(new Date(2026, 0, 1, 12));
  });

  it('accepts 29 February in a leap year', () => {
    expect(readConfig('?date=2028-02-29', {}).date).toEqual(new Date(2028, 1, 29, 12));
  });

  it.each([
    '2026-02-29', // not a leap year
    '2026-02-30',
    '2026-04-31',
    '2026-10-00',
    '2026-13-01',
    '2026-00-15',
    '2026-13-45',
    '0026-06-15', // Date maps years 0–99 to 19xx
  ])('rejects the impossible date %s instead of rolling it over', v => {
    expect(readConfig(`?date=${v}`, {}).date).toBeNull();
  });

  it.each(['15/12/2026', '2026-1-5', '2026-12-15T10:00', 'today', '20261215'])('rejects the malformed date %s', v => {
    expect(readConfig(`?date=${encodeURIComponent(v)}`, {}).date).toBeNull();
  });
});

/** In-memory Storage. */
const memory = (init: Record<string, string> = {}): ShopStorage & { data: Record<string, string> } => {
  const data = { ...init };
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
  };
};

describe('readShop — shop identity, remembered on the device', () => {
  it('no shop by default (network-wide book)', () => {
    expect(readShop('', memory())).toBeNull();
    expect(readConfig('', {}).shop).toBeNull();
  });

  it('?shop=<digits> picks the shop and remembers it (the installed app opens without the query string)', () => {
    const s = memory();
    expect(readShop('?shop=4', s)).toBe('4');
    expect(s.data).toEqual({ [SHOP_KEY]: '4' });
    expect(readShop('', s)).toBe('4');
    expect(readShop('?lang=nl', s)).toBe('4');
    expect(readConfig('?prices=0', {}, s).shop).toBe('4');
  });

  it('a new ?shop= replaces the remembered one; ?shop= (empty) forgets it', () => {
    const s = memory({ [SHOP_KEY]: '4' });
    expect(readShop('?shop=12', s)).toBe('12');
    expect(s.data[SHOP_KEY]).toBe('12');
    expect(readShop('?shop=', s)).toBeNull();
    expect(s.data).toEqual({});
    expect(readShop('', s)).toBeNull();
    s.data[SHOP_KEY] = '4';
    expect(readShop('?shop=%20', s)).toBeNull();
    expect(s.data).toEqual({});
  });

  it.each(['abc', '4a', '-4', '4.5', '1234567890', '4%204'])('ignores the malformed value %s (the remembered shop stays)', v => {
    const s = memory({ [SHOP_KEY]: '7' });
    expect(readShop(`?shop=${v}`, s)).toBe('7');
    expect(s.data[SHOP_KEY]).toBe('7');
  });

  it('ignores a tampered remembered value', () => {
    expect(readShop('', memory({ [SHOP_KEY]: '<script>' }))).toBeNull();
  });

  it('works without storage, or when it throws (private mode, blocked site data)', () => {
    const throwing: ShopStorage = {
      getItem: () => { throw new DOMException('denied', 'SecurityError'); },
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
      removeItem: () => { throw new DOMException('denied', 'SecurityError'); },
    };
    expect(readShop('?shop=4', throwing)).toBe('4');
    expect(readShop('', throwing)).toBeNull();
    expect(readShop('?shop=', throwing)).toBeNull();
    expect(readShop('?shop=4', null)).toBe('4');
    expect(readShop('', null)).toBeNull();
  });
});
