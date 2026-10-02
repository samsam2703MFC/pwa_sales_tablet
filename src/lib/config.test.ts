import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

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
