import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { FIXTURE_BOOK as F, FIXTURE_CATALOG as LK, product } from '../../test/fixtures';
import { combos, pairs, reflexes } from './ventes.logic';

describe('combos', () => {
  it('name, slot, formatted price ("" when none) and product tiles, in data order', () => {
    const c = combos(0, F.combos, true, LK);
    expect(c.map(x => [x.name, x.when, x.price])).toEqual([['Formule un', 'matin', '3,90 €'], ['Formule deux', 'soir', '']]);
    expect(c[0].items.map(p => [p.id, p.name, p.img])).toEqual([
      ['p1', 'p1-fr', '/img/p/p1.png'], ['p1', 'p1-fr', '/img/p/p1.png'], ['p5', 'p5-fr', '/img/p/p5.png'],
    ]);
    expect(c[1].items).toEqual([]);
  });

  it('a product listed twice gives two tiles; unknown ids are skipped', () => {
    expect(combos(0, F.combos, true, LK)[0].items.map(p => p.id)).toEqual(['p1', 'p1', 'p5']);
  });

  it('is translated (NL)', () => {
    const c = combos(1, F.combos, true, LK);
    expect(c.map(x => [x.name, x.when])).toEqual([['Formule een', 'ochtend'], ['Formule twee', 'avond']]);
    expect(c[0].items.map(p => p.name)).toEqual(['p1-nl', 'p1-nl', 'p5-nl']);
  });

  it('hides every price when prices are switched off', () => {
    expect(combos(0, F.combos, false, LK).map(x => x.price)).toEqual(['', '']);
  });

  it('stable ids (data index), the same in FR and NL', () => {
    expect(combos(0, F.combos, true, LK).map(c => c.id)).toEqual(['0', '1']);
    expect(combos(1, F.combos, true, LK).map(c => c.id)).toEqual(['0', '1']);
    const twins = [F.combos[0], F.combos[0]];
    expect(new Set(combos(0, twins, true, LK).map(c => c.id)).size).toBe(2); // same name, distinct keys
  });
});

describe('reflexes', () => {
  it('numbers the reflexes from 1, in data order, translated', () => {
    expect(reflexes(0, F.reflexes)).toEqual([{ n: '1', text: 'Réflexe un' }, { n: '2', text: 'Réflexe deux' }]);
    expect(reflexes(1, F.reflexes).map(r => r.text)).toEqual(['Reflex een', 'Reflex twee']);
  });
});

describe('pairs', () => {
  it('one row per product that has something to suggest, in data order', () => {
    expect(pairs(0, F.products, LK).map(r => r.id)).toEqual(['p1', 'p2', 'p4']);
  });

  it('leaves out a product with no known cross-sell product and no sentence (BO data)', () => {
    expect(pairs(0, [product('x'), product('y', { cross: ['ghost'] })], LK)).toEqual([]);
    expect(pairs(0, [product('z', { crossLine: ['Avec un café ?', ''] })], LK)).toEqual([{ id: 'z', name: 'z-fr', cross: '', line: 'Avec un café ?' }]);
    // an empty Dutch sentence falls back to the French one
    expect(pairs(1, [product('z', { crossLine: ['Avec un café ?', ''] })], LK)[0].line).toBe('Avec un café ?');
  });

  it('joins the cross-sell names with " · ", skips unknown ids, keeps the sentence (FR / NL)', () => {
    expect(pairs(0, F.products, LK)[0]).toEqual({ id: 'p1', name: 'p1-fr', cross: 'p2-fr', line: 'Avec une tarte ?' });
    expect(pairs(1, F.products, LK)[0]).toEqual({ id: 'p1', name: 'p1-nl', cross: 'p2-nl', line: 'Met een taart?' });
    expect(pairs(0, F.products, LK)[2].cross).toBe('p1-fr · p1-fr');
  });

  it('only a sentence → empty cross-sell names', () => {
    expect(pairs(0, [product('x', { crossLine: ['Dites-le', 'Zeg het'] })], LK)[0].cross).toBe('');
  });
});

describe('sample data (prototype golden values)', () => {
  it('the 4 formulas (FR)', () => {
    const c = combos(0, BOOK.combos, true);
    expect(c.map(x => x.name)).toEqual(['Formule matin', 'Formule midi', 'Pause goûter', 'Brunch du dimanche']);
    expect(c.map(x => x.when)).toEqual(['7 h – 11 h', '11 h 30 – 14 h', '15 h – 18 h', 'Week-end']);
    expect(c.map(x => x.price)).toEqual(['3,90 €', '11,50 €', '6,50 €', '']);
    expect(c.map(x => x.items.map(p => p.id))).toEqual([
      ['croissant', 'cafe'],
      ['club', 'limonade', 'cookie'],
      ['brioche', 'cafe'],
      ['pistolet', 'croissant', 'jus', 'tarteriz'],
    ]);
    expect(c[0].items.map(p => p.name)).toEqual(['Croissant pur beurre', 'Café & latte']);
    expect(c[0].items[0].img).toMatch(/img\/p\/croissant\.png$/);
  });

  it('the 4 formulas (NL)', () => {
    const c = combos(1, BOOK.combos, true);
    expect(c.map(x => x.name)).toEqual(['Ochtendformule', 'Middagformule', 'Vieruurtje', 'Zondagsbrunch']);
    expect(c[1].when).toBe('11 u 30 – 14 u');
    expect(c[0].items.map(p => p.name)).toEqual(['Croissant met roomboter', 'Koffie & latte']);
  });

  it('reflexes', () => {
    expect(reflexes(0).map(r => r.n)).toEqual(['1', '2', '3', '4']);
    expect(reflexes(0)[0].text).toBe('Toujours proposer une boisson avec un produit snacking.');
    expect(reflexes(1)[0].text).toBe('Altijd een drankje voorstellen bij een snack.');
  });

  it('associations', () => {
    expect(pairs(0).map(r => r.id)).toEqual(BOOK.products.map(x => x.id));
    expect(pairs(0)[0]).toEqual({
      id: 'croissant',
      name: 'Croissant pur beurre',
      cross: "Café & latte · Jus d'orange pressé",
      line: 'Avec un café, vous avez le petit-déjeuner complet.',
    });
    expect(pairs(0).find(r => r.id === 'glace')!.cross).toBe('Cookie chocolat noisette');
    expect(pairs(1)[0]).toMatchObject({
      name: 'Croissant met roomboter',
      cross: 'Koffie & latte · Versgeperst sinaasappelsap',
      line: 'Met een koffie heeft u meteen een volledig ontbijt.',
    });
  });
});
