import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { onbLabels } from '../../lib/i18n';
import { bestSellers, homeModel, nextSeason, ONB_MODULES, quickAsks, seasonsNow, toSeasonVM } from './home.logic';

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

describe('season selection', () => {
  for (let month = 1; month <= 12; month++) {
    const [now, next] = EXPECTED[month];
    it(`month ${month}: now = ${now.join(', ')}, next = ${next}`, () => {
      expect(seasonsNow(month).map(x => x.id)).toEqual(now);
      expect(nextSeason(month).id).toBe(next);
    });
  }

  it('never proposes a running season as the next one', () => {
    for (let month = 1; month <= 12; month++) {
      expect(nextSeason(month).m).not.toContain(month);
    }
  });

  it('wraps to the first season when nothing starts later in the year', () => {
    expect(nextSeason(12)).toBe(BOOK.seasons[0]);
  });
});

describe('season view model', () => {
  const autumn = BOOK.seasons.find(x => x.id === 'automne')!;

  it('is translated (FR / NL) and resolves the illustration', () => {
    const fr = toSeasonVM(autumn, 0), nl = toSeasonVM(autumn, 1);
    expect(fr.name).toBe('Automne');
    expect(fr.dates).toBe('15 septembre au 30 novembre');
    expect(fr.tip).toBe('Offre 4 + 1 sur la brioche croustillante.');
    expect(nl.name).toBe('Herfst');
    expect(nl.dates).toBe('15 september t/m 30 november');
    expect(nl.tip).toBe('Actie 4 + 1 op de krokante brioche.');
    expect(fr.img).toMatch(/img\/s\/autumn-range\.png$/);
  });

  it('lists the products of the season, in data order', () => {
    const ids = BOOK.products.filter(p => p.season === 'automne').map(p => p.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(toSeasonVM(autumn, 0).products.map(p => p.id)).toEqual(ids);
  });
});

describe('best sellers', () => {
  it('keeps the products flagged best, in data order', () => {
    expect(bestSellers(0).map(p => p.id)).toEqual(['croissant', 'pistolet', 'campagne', 'tarteriz', 'cookie', 'club']);
  });

  it('is translated, with formatted prices', () => {
    const fr = bestSellers(0), nl = bestSellers(1);
    expect(fr[0].name).toBe(BOOK.products.find(p => p.id === 'croissant')!.name[0]);
    expect(nl[0].name).toBe(BOOK.products.find(p => p.id === 'croissant')!.name[1]);
    expect(fr[0].price).toMatch(/^\d+,\d{2} €$/);
  });
});

describe('quick asks', () => {
  it('opens the pre-filtered sections of the prototype', () => {
    expect(quickAsks(0).map(q => [q.view, q.extra])).toEqual([
      ['al', { ex: ['gluten'] }],
      ['al', { ex: ['lait'] }],
      ['al', { ex: ['noix', 'arach'] }],
      ['gamme', { vegan: true, cat: 'all' }],
      ['svc', undefined],
      ['ventes', undefined],
    ]);
  });

  it('has unique ids, identical in FR and NL (stable React keys)', () => {
    const fr = quickAsks(0).map(q => q.id), nl = quickAsks(1).map(q => q.id);
    expect(new Set(fr).size).toBe(fr.length);
    expect(nl).toEqual(fr);
  });

  it('uses only existing allergen ids', () => {
    const ids = new Set(BOOK.allergens.map(a => a.id));
    for (const q of quickAsks(0)) for (const id of q.extra?.ex ?? []) expect(ids.has(id)).toBe(true);
  });

  it('is labelled in FR', () => {
    expect(quickAsks(0).map(q => [q.label, q.sub])).toEqual([
      ['Sans gluten ?', 'Allergènes'],
      ['Sans lait ?', 'Allergènes'],
      ['Sans fruits à coque ?', 'Allergènes'],
      ['Quelque chose de vegan ?', 'La gamme'],
      ['Commander un gâteau', 'Services'],
      ['Un lunch rapide', 'Vendre plus'],
    ]);
  });

  it('is labelled in NL', () => {
    expect(quickAsks(1).map(q => [q.label, q.sub])).toEqual([
      ['Glutenvrij?', 'Allergenen'],
      ['Zonder melk?', 'Allergenen'],
      ['Zonder noten?', 'Allergenen'],
      ['Iets veganistisch?', 'Assortiment'],
      ['Een taart bestellen', 'Diensten'],
      ['Een snelle lunch', 'Meer verkopen'],
    ]);
  });
});

describe('onboarding banner', () => {
  it('counts the 7 modules (opening + 6)', () => {
    expect(ONB_MODULES).toBe(7);
  });

  it('matches the prototype wording in FR and NL', () => {
    expect(onbLabels(0).homeT(ONB_MODULES)).toBe('Formation vente en 7 modules · 1 min de lecture par module');
    expect(onbLabels(1).homeT(ONB_MODULES)).toBe('Verkoopopleiding in 7 modules · 1 min lezen per module');
  });
});

describe('homeModel', () => {
  it('assembles the home for October (FR)', () => {
    const m = homeModel(0, 10);
    expect(m.quick).toHaveLength(6);
    expect(m.now.map(x => x.name)).toEqual(['Automne']);
    expect(m.next.name).toBe('Saint-Nicolas');
    expect(m.best).toHaveLength(6);
  });

  it('assembles the home for December (NL)', () => {
    const m = homeModel(1, 12);
    expect(m.now.map(x => x.name)).toEqual(['Sinterklaas', 'Kerst & Nieuwjaar']);
    expect(m.next.name).toBe('Driekoningen');
  });
});
