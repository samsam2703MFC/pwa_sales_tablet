import { describe, expect, it } from 'vitest';
import { BOOK } from '../data/book';
import { FIXTURE_BOOK as F, FIXTURE_CATALOG as LK } from '../test/fixtures';
import { nextSeason, seasonsNow, toSeasonVM } from './seasons';

const now = (month: number) => seasonsNow(month, F.seasons).map(x => x.id);
const next = (month: number) => nextSeason(month, F.seasons).id;

describe('season selection', () => {
  it('seasons running this month, in data order (several can overlap)', () => {
    expect(now(1)).toEqual([]);
    expect(now(3)).toEqual(['s1']);
    expect(now(4)).toEqual(['s1']);
    expect(now(12)).toEqual(['s2', 's3']);
  });

  it('next season: the first one starting later that is not already running', () => {
    expect(next(1)).toBe('s1');
    expect(next(3)).toBe('s2');
    expect(next(11)).toBe('s3'); // s2 is running, s3 starts in December
  });

  it('wraps to the first season of the year when nothing starts later', () => {
    expect(next(12)).toBe('s1');
  });

  it('never proposes a running season as the next one', () => {
    for (let month = 1; month <= 12; month++) expect(nextSeason(month, F.seasons).m).not.toContain(month);
  });
});

describe('season view model', () => {
  const [s1, s2] = F.seasons;

  it('is translated (FR / NL) and resolves the illustration', () => {
    expect(toSeasonVM(s1, 0, F.products, LK)).toMatchObject({ id: 's1', name: 'Printemps', dates: 'mars – avril', tip: 'Mettre en avant', img: '/img/s/s1.png' });
    expect(toSeasonVM(s1, 1, F.products, LK)).toMatchObject({ name: 'Lente', dates: 'maart – april', tip: 'In de kijker' });
  });

  it('lists the products of the season, in data order, as cards', () => {
    expect(toSeasonVM(s1, 0, F.products, LK).products.map(p => [p.id, p.seasonName])).toEqual([['p2', 'Printemps']]);
    expect(toSeasonVM(s2, 1, F.products, LK).products.map(p => p.name)).toEqual(['p4-nl']);
    expect(toSeasonVM(F.seasons[2], 0, F.products, LK).products).toEqual([]);
  });
});

describe('sample data (prototype golden values)', () => {
  /** month → [ids of the seasons of the moment, id of the next season], from the prototype rules. */
  const EXPECTED: Record<number, [string[], string]> = {
    1: [['epiphanie'], 'valentin'],
    2: [['valentin'], 'paques'],
    3: [['paques'], 'meres'],
    4: [['paques'], 'meres'],
    5: [['meres'], 'ete'],
    6: [['ete'], 'automne'],
    7: [['ete'], 'automne'],
    8: [['ete'], 'automne'],
    9: [['automne'], 'stnicolas'],
    10: [['automne'], 'stnicolas'],
    11: [['automne', 'stnicolas'], 'noel'],
    12: [['stnicolas', 'noel'], 'epiphanie'],
  };

  for (let month = 1; month <= 12; month++) {
    const [ids, nextId] = EXPECTED[month];
    it(`month ${month}: now = ${ids.join(', ')}, next = ${nextId}`, () => {
      expect(seasonsNow(month).map(x => x.id)).toEqual(ids);
      expect(nextSeason(month).id).toBe(nextId);
    });
  }

  it('autumn texts (FR / NL) and illustration', () => {
    const autumn = BOOK.seasons.find(x => x.id === 'automne')!;
    const fr = toSeasonVM(autumn, 0), nl = toSeasonVM(autumn, 1);
    expect([fr.name, fr.dates, fr.tip]).toEqual(['Automne', '15 septembre au 30 novembre', 'Offre 4 + 1 sur la brioche croustillante.']);
    expect([nl.name, nl.dates, nl.tip]).toEqual(['Herfst', '15 september t/m 30 november', 'Actie 4 + 1 op de krokante brioche.']);
    expect(fr.img).toMatch(/img\/s\/autumn-range\.png$/);
  });
});
