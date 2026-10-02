import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { homeModel, quickAsks } from './home.logic';

// Season selection and the season view model: src/lib/seasons.test.ts.

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

describe('sample data (prototype golden values)', () => {
  it('assembles the home for October (FR)', () => {
    const m = homeModel(0, 10);
    expect(m.quick).toHaveLength(6);
    expect(m.now.map(x => x.name)).toEqual(['Automne']);
    // The onboarding banner, "À préparer" and "Les plus vendus" are no longer on the home page.
    expect(Object.keys(m)).toEqual(['quick', 'now']);
  });

  it('assembles the home for December (NL)', () => {
    const m = homeModel(1, 12);
    expect(m.now.map(x => x.name)).toEqual(['Sinterklaas', 'Kerst & Nieuwjaar']);
  });
});
