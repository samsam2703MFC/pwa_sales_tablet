import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
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

describe('calendarRows', () => {
  /** Season id → months with a red bar, from the README. */
  const MONTHS: Record<string, number[]> = {
    epiphanie: [1], valentin: [2], paques: [3, 4], meres: [5], ete: [6, 7, 8], automne: [9, 10, 11], stnicolas: [11, 12], noel: [12],
  };

  it('has one row per season, 12 cells each, bars on the season months', () => {
    const rows = calendarRows(0, 10);
    expect(rows.map(r => r.id)).toEqual(Object.keys(MONTHS));
    for (const r of rows) {
      expect(r.cells).toHaveLength(12);
      expect(r.cells.flatMap((c, i) => (c.on ? [i + 1] : []))).toEqual(MONTHS[r.id]);
    }
  });

  it('tints the current-month column on every row', () => {
    for (const r of calendarRows(0, 7)) {
      expect(r.cells.flatMap((c, i) => (c.current ? [i + 1] : []))).toEqual([7]);
    }
  });

  it('season names follow the language', () => {
    expect(calendarRows(0, 1).map(r => r.name)).toEqual(['Épiphanie', 'Saint-Valentin', 'Pâques', 'Fête des mères', 'Été · Glaces', 'Automne', 'Saint-Nicolas', 'Noël & Nouvel An']);
    expect(calendarRows(1, 1).map(r => r.name)).toEqual(['Driekoningen', 'Valentijn', 'Pasen', 'Moederdag', 'Zomer · IJs', 'Herfst', 'Sinterklaas', 'Kerst & Nieuwjaar']);
  });
});

describe('seasonCards', () => {
  it('one card per season, in data order, with its products', () => {
    const cards = seasonCards(0, 10);
    expect(cards.map(c => c.id)).toEqual(BOOK.seasons.map(x => x.id));
    expect(cards.map(c => c.products.map(p => p.id))).toEqual([
      ['galette'], ['coeur'], ['nid'], ['fraisier'], ['glace'], ['brioche'], ['speculoos'], ['buche'],
    ]);
  });

  it('flags the seasons running this month ("En ce moment")', () => {
    const now = (m: number) => seasonCards(0, m).filter(c => c.isNow).map(c => c.id);
    expect(now(10)).toEqual(['automne']);
    expect(now(11)).toEqual(['automne', 'stnicolas']);
    expect(now(12)).toEqual(['stnicolas', 'noel']);
    expect(now(4)).toEqual(['paques']);
  });

  it('texts follow the language (FR / NL)', () => {
    const fr = seasonCards(0, 10).find(c => c.id === 'automne')!;
    const nl = seasonCards(1, 10).find(c => c.id === 'automne')!;
    expect([fr.name, fr.dates, fr.tip]).toEqual(['Automne', '15 septembre au 30 novembre', 'Offre 4 + 1 sur la brioche croustillante.']);
    expect([nl.name, nl.dates, nl.tip]).toEqual(['Herfst', '15 september t/m 30 november', 'Actie 4 + 1 op de krokante brioche.']);
    expect(fr.img).toMatch(/img\/s\/autumn-range\.png$/);
  });
});
