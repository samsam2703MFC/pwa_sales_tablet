import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { toSeasonVM } from '../../lib/seasons';
import { FIXTURE_BOOK as F } from '../../test/fixtures';
import { calendarRows, monthHeaders, seasonCards } from './saisons.logic';

describe('monthHeaders', () => {
  it('lists the 12 short month names and flags the current one (FR)', () => {
    const h = monthHeaders(0, 10);
    expect(h.map(m => m.label)).toEqual(['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']);
    expect(h.filter(m => m.current).map(m => m.label)).toEqual(['Oct']);
  });

  it('is translated (NL)', () => {
    const h = monthHeaders(1, 3);
    expect(h.map(m => m.label)).toEqual(['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']);
    expect(h.filter(m => m.current).map(m => m.label)).toEqual(['Mrt']);
  });

  it('January and December edges', () => {
    expect(monthHeaders(0, 1).findIndex(m => m.current)).toBe(0);
    expect(monthHeaders(0, 12).findIndex(m => m.current)).toBe(11);
  });
});

/** Months (1–12) of a row's red bars. */
const barMonths = (cells: { on: boolean }[]) => cells.flatMap((c, i) => (c.on ? [i + 1] : []));

describe('calendarRows', () => {
  it('one row per season in data order, 12 cells each, bars on the season months', () => {
    const rows = calendarRows(0, 10, F.seasons);
    expect(rows.map(r => r.id)).toEqual(['s1', 's2', 's3']);
    expect(rows.map(r => r.cells.length)).toEqual([12, 12, 12]);
    expect(rows.map(r => barMonths(r.cells))).toEqual([[3, 4], [11, 12], [12]]);
  });

  it('tints the current-month column on every row', () => {
    for (const r of calendarRows(0, 7, F.seasons)) {
      expect(r.cells.flatMap((c, i) => (c.current ? [i + 1] : []))).toEqual([7]);
    }
  });

  it('season names follow the language', () => {
    expect(calendarRows(0, 1, F.seasons).map(r => r.name)).toEqual(['Printemps', 'Hiver', 'Fêtes']);
    expect(calendarRows(1, 1, F.seasons).map(r => r.name)).toEqual(['Lente', 'Winter', 'Feesten']);
  });
});

describe('seasonCards', () => {
  it('one card per season, in data order: the season view model plus "En ce moment"', () => {
    const cards = seasonCards(1, 4, F.seasons, F.products);
    expect(cards).toEqual(F.seasons.map((x, i) => ({ ...toSeasonVM(x, 1, F.products), isNow: i === 0 })));
    expect(cards.map(c => c.products.map(p => p.id))).toEqual([['p2'], ['p4'], []]);
  });

  it('flags the seasons running this month', () => {
    const now = (m: number) => seasonCards(0, m, F.seasons, F.products).filter(c => c.isNow).map(c => c.id);
    expect(now(1)).toEqual([]);
    expect(now(3)).toEqual(['s1']);
    expect(now(11)).toEqual(['s2']);
    expect(now(12)).toEqual(['s2', 's3']);
  });
});

describe('sample data (prototype golden values)', () => {
  /** Season id → months with a red bar, from the README. */
  const MONTHS: Record<string, number[]> = {
    epiphanie: [1], valentin: [2], paques: [3, 4], meres: [5], ete: [6, 7, 8], automne: [9, 10, 11], stnicolas: [11, 12], noel: [12],
  };

  it('calendar rows and bars', () => {
    const rows = calendarRows(0, 10);
    expect(rows.map(r => r.id)).toEqual(Object.keys(MONTHS));
    for (const r of rows) expect(barMonths(r.cells)).toEqual(MONTHS[r.id]);
  });

  it('season names (FR / NL)', () => {
    expect(calendarRows(0, 1).map(r => r.name)).toEqual(['Épiphanie', 'Saint-Valentin', 'Pâques', 'Fête des mères', 'Été · Glaces', 'Automne', 'Saint-Nicolas', 'Noël & Nouvel An']);
    expect(calendarRows(1, 1).map(r => r.name)).toEqual(['Driekoningen', 'Valentijn', 'Pasen', 'Moederdag', 'Zomer · IJs', 'Herfst', 'Sinterklaas', 'Kerst & Nieuwjaar']);
  });

  it('season cards and their products', () => {
    const cards = seasonCards(0, 10);
    expect(cards.map(c => c.id)).toEqual(BOOK.seasons.map(x => x.id));
    expect(cards.map(c => c.products.map(p => p.id))).toEqual([
      ['galette'], ['coeur'], ['nid'], ['fraisier'], ['glace'], ['brioche'], ['speculoos'], ['buche'],
    ]);
  });

  it('"En ce moment"', () => {
    const now = (m: number) => seasonCards(0, m).filter(c => c.isNow).map(c => c.id);
    expect(now(10)).toEqual(['automne']);
    expect(now(11)).toEqual(['automne', 'stnicolas']);
    expect(now(12)).toEqual(['stnicolas', 'noel']);
    expect(now(4)).toEqual(['paques']);
  });
});
