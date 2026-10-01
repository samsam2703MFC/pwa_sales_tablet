import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { Product } from '../../data/types';
import { combos, pairs, reflexes } from './ventes.logic';

describe('combos', () => {
  it('lists the 4 formulas with slot, formatted price and product tiles (FR)', () => {
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

  it('is translated (NL)', () => {
    const c = combos(1, BOOK.combos, true);
    expect(c.map(x => x.name)).toEqual(['Ochtendformule', 'Middagformule', 'Vieruurtje', 'Zondagsbrunch']);
    expect(c[1].when).toBe('11 u 30 – 14 u');
    expect(c[0].items.map(p => p.name)).toEqual(['Croissant met roomboter', 'Koffie & latte']);
  });

  it('hides every price when prices are switched off', () => {
    expect(combos(0, BOOK.combos, false).map(x => x.price)).toEqual(['', '', '', '']);
  });

  it('skips unknown product ids', () => {
    const c = combos(0, [{ n: ['X', 'X'], when: ['', ''], items: ['nope', 'cafe'], price: 2 }], true);
    expect(c[0].items.map(p => p.id)).toEqual(['cafe']);
    expect(c[0].price).toBe('2,00 €');
  });
});

describe('reflexes', () => {
  it('numbers the reflexes from 1, in data order', () => {
    expect(reflexes(0).map(r => r.n)).toEqual(['1', '2', '3', '4']);
    expect(reflexes(0)[0].text).toBe('Toujours proposer une boisson avec un produit snacking.');
  });

  it('is translated (NL)', () => {
    expect(reflexes(1)[0].text).toBe('Altijd een drankje voorstellen bij een snack.');
    expect(reflexes(1)).toHaveLength(BOOK.reflexes.length);
  });
});

describe('pairs', () => {
  it('has one row per product, in data order', () => {
    const p = pairs(0);
    expect(p.map(r => r.id)).toEqual(BOOK.products.map(x => x.id));
  });

  it('joins the cross-sell names with " · " and keeps the sentence (FR)', () => {
    const croissant = pairs(0)[0];
    expect(croissant).toEqual({
      id: 'croissant',
      name: 'Croissant pur beurre',
      cross: "Café & latte · Jus d'orange pressé",
      line: 'Avec un café, vous avez le petit-déjeuner complet.',
    });
    expect(pairs(0).find(r => r.id === 'glace')!.cross).toBe('Cookie chocolat noisette');
  });

  it('is translated (NL)', () => {
    const croissant = pairs(1)[0];
    expect(croissant.name).toBe('Croissant met roomboter');
    expect(croissant.cross).toBe('Koffie & latte · Versgeperst sinaasappelsap');
    expect(croissant.line).toBe('Met een koffie heeft u meteen een volledig ontbijt.');
  });

  it('skips unknown cross-sell ids; no cross-sell → empty string', () => {
    const base = BOOK.products[0];
    const xs: Product[] = [{ ...base, id: 'a', cross: ['nope', 'jus'] }, { ...base, id: 'b', cross: [] }];
    expect(pairs(0, xs).map(r => r.cross)).toEqual(["Jus d'orange pressé", '']);
  });
});
