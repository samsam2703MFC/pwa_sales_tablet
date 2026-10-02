import { describe, expect, it } from 'vitest';
import { dlcLabel, eur, eur2, fmtPrice } from './format';
import { labels } from './i18n';

describe('fmtPrice', () => {
  it('formats with a decimal comma and the euro sign', () => {
    expect(fmtPrice(1.3, true)).toBe('1,30 €');
    expect(fmtPrice(12, true)).toBe('12,00 €');
    expect(fmtPrice(0, true)).toBe('0,00 €');
  });

  it('is empty when the price is unknown', () => {
    expect(fmtPrice(null, true)).toBe('');
    expect(fmtPrice(undefined, true)).toBe('');
  });

  it('is empty when prices are hidden', () => {
    expect(fmtPrice(1.3, false)).toBe('');
  });
});

describe('eur / eur2', () => {
  it('rounds and groups thousands the Belgian way per language', () => {
    expect(eur(4310.4, 0)).toBe('4 310 €'); // fr-BE: narrow no-break space
    expect(eur(4310.4, 1)).toBe('4.310 €'); // nl-BE: dot
    expect(eur(99.5, 0)).toBe('100 €');
  });

  it('keeps two decimals with a comma', () => {
    expect(eur2(9.54)).toBe('9,54 €');
    expect(eur2(3)).toBe('3,00 €');
  });
});

describe('dlcLabel', () => {
  it('names same-day and immediate consumption, else counts the days', () => {
    expect(dlcLabel(0, labels(0))).toBe('Immédiat');
    expect(dlcLabel(1, labels(0))).toBe('Jour même');
    expect(dlcLabel(3, labels(0))).toBe('3 jours');
    expect(dlcLabel(0, labels(1))).toBe('Onmiddellijk');
    expect(dlcLabel(1, labels(1))).toBe('Dezelfde dag');
    expect(dlcLabel(5, labels(1))).toBe('5 dagen');
  });
});
