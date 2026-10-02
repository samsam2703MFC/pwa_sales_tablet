import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { onbLabels } from '../../lib/i18n';
import { FIXTURE_BOOK as F } from '../../test/fixtures';
import { bestSellers, homeModel, ONB_MODULES, quickAsks } from './home.logic';

// Season selection and the season view model: src/lib/seasons.test.ts.

describe('best sellers', () => {
  it('keeps the products flagged best, in data order, as translated cards', () => {
    expect(bestSellers(0, F.products).map(p => [p.id, p.name, p.price])).toEqual([['p1', 'p1-fr', '2,50 €'], ['p3', 'p3-fr', '']]);
    expect(bestSellers(1, F.products).map(p => p.name)).toEqual(['p1-nl', 'p3-nl']);
    expect(bestSellers(0, [])).toEqual([]);
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

describe('sample data (prototype golden values)', () => {
  it('best sellers', () => {
    expect(bestSellers(0).map(p => p.id)).toEqual(['croissant', 'pistolet', 'campagne', 'tarteriz', 'cookie', 'club']);
    expect(bestSellers(1)[0].name).toBe('Croissant met roomboter');
  });

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
