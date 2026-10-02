import { describe, expect, it } from 'vitest';
import { FIXTURE_BOOK, FIXTURE_CATALOG as LK, product } from '../test/fixtures';
import { cardById, cardsByIds, catalogOf, knownProducts, toCard } from './catalog';

const P = (id: string) => LK.products[id]!;

describe('toCard', () => {
  it('builds the card in each language, allergen codes in the product order', () => {
    expect(toCard(P('p2'), 0, LK)).toEqual({
      id: 'p2', name: 'p2-fr', img: '/img/p/p2.png', price: '4,00 €', unit: 'pièce', als: ['AAA', 'BBB'],
      best: false, seasonal: true, seasonName: 'Printemps', vegan: false, vege: true,
    });
    expect(toCard(P('p2'), 1, LK)).toMatchObject({ name: 'p2-nl', unit: 'stuk', seasonName: 'Lente' });
  });

  it('no price → empty price; flags best / vegan; not seasonal', () => {
    expect(toCard(P('p3'), 0, LK)).toMatchObject({ price: '', best: true, vegan: false, vege: false, seasonal: false, seasonName: '' });
    expect(toCard(P('p1'), 0, LK)).toMatchObject({ price: '2,50 €', vegan: true });
  });

  it('skips an unknown allergen or season id instead of crashing (hand-entered data)', () => {
    const x = product('x', { al: ['a1', 'ghost', 'a3'], season: 'ghost' });
    expect(toCard(x, 0, LK)).toMatchObject({ als: ['AAA', 'CCC'], seasonal: true, seasonName: '' });
  });
});

describe('knownProducts / cardsByIds / cardById', () => {
  it('keep the order, skip unknown ids and keep a repeated id', () => {
    expect(knownProducts(['p3', 'ghost', 'p1', 'p3'], LK.products).map(p => p.id)).toEqual(['p3', 'p1', 'p3']);
    expect(cardsByIds(['p3', 'ghost', 'p1', 'p3'], 1, LK).map(c => c.name)).toEqual(['p3-nl', 'p1-nl', 'p3-nl']);
    expect(cardsByIds([], 0, LK)).toEqual([]);
  });

  it('cardById: the card, or null for an unknown id', () => {
    expect(cardById('p5', 0, LK)?.name).toBe('p5-fr');
    expect(cardById('ghost', 0, LK)).toBeNull();
  });
});

describe('catalogOf', () => {
  it('indexes every record by id, once per book', () => {
    expect(Object.keys(LK.products)).toEqual(FIXTURE_BOOK.products.map(p => p.id));
    expect(LK.allergens.a2?.s).toBe('BBB');
    expect(LK.categories.c2?.n[0]).toBe('Catégorie deux');
    expect(LK.seasons.ghost).toBeUndefined();
    expect(catalogOf(FIXTURE_BOOK)).toBe(LK);
  });
});
