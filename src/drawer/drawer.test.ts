import { describe, expect, it } from 'vitest';
import type { FaqItem } from '../data/types';
import { PRODUCTS } from '../lib/catalog';
import { FIXTURE_BOOK as F, FIXTURE_CATALOG as LK, product } from '../test/fixtures';
import {
  allergenGrid, allergenState, availability, backName, comboVM, isCloseSwipe, productFaq, salesArgs, sheetVM,
} from './drawer.logic';

const P = (id: string) => LK.products[id]!;

describe('availability', () => {
  it('"Toute l\'année" / "Het hele jaar" for a permanent product', () => {
    expect(availability(P('p1'), 0, LK.seasons)).toBe("Toute l'année");
    expect(availability(P('p1'), 1, LK.seasons)).toBe('Het hele jaar');
  });

  it('"Season · dates" for a seasonal product (FR / NL)', () => {
    expect(availability(P('p2'), 0, LK.seasons)).toBe('Printemps · mars – avril');
    expect(availability(P('p4'), 1, LK.seasons)).toBe('Winter · november – december');
  });

  it('an unknown season id falls back to "all year" instead of crashing', () => {
    expect(availability(product('x', { season: 'ghost' }), 0, LK.seasons)).toBe("Toute l'année");
  });
});

describe('allergenGrid / allergenState', () => {
  it('lists every allergen in data order, translated, with the product\'s state', () => {
    expect(allergenGrid(P('p1'), 0, F.allergens)).toEqual([
      { id: 'a1', n: 'Alpha', state: 'contains' },
      { id: 'a2', n: 'Bêta', state: 'traces' },
      { id: 'a3', n: 'Gamma', state: 'absent' },
    ]);
    expect(allergenGrid(P('p1'), 1, F.allergens).map(a => a.n)).toEqual(['Alfa', 'Bèta', 'Gamma']);
    expect(allergenGrid(P('p5'), 0, F.allergens).every(a => a.state === 'absent')).toBe(true);
  });

  it('"contains" wins when an allergen is listed both as ingredient and trace', () => {
    expect(allergenState(product('x', { al: ['a1'], tr: ['a1'] }), 'a1')).toBe('contains');
  });
});

describe('productFaq', () => {
  it('keeps the questions linked to the product, in order, with their FAQ index (FR / NL)', () => {
    expect(productFaq('p1', -1, 0, F.faq).map(f => [f.index, f.q, f.a])).toEqual([
      [0, 'Question un ?', 'Réponse un'],
      [2, 'Question trois ?', 'Réponse trois'],
    ]);
    expect(productFaq('p1', -1, 1, F.faq).map(f => f.q)).toEqual(['Vraag een?', 'Vraag drie?']);
  });

  it('is empty when no question mentions the product', () => {
    expect(productFaq('p2', -1, 0, F.faq)).toEqual([]);
  });

  it('opens only `selFaq` ("−"), the others show "+"', () => {
    expect(productFaq('p1', 2, 0, F.faq).map(x => [x.open, x.sign])).toEqual([[false, '+'], [true, '−']]);
    expect(productFaq('p1', 1, 0, F.faq).every(x => !x.open && x.sign === '+')).toBe(true);
  });

  it('ignores questions without linked products', () => {
    const faq: FaqItem[] = [{ cat: 'al', q: ['a', 'a'], a: ['b', 'b'] }, { cat: 'al', p: ['x'], q: ['c', 'c'], a: ['d', 'd'] }];
    expect(productFaq('x', -1, 0, faq).map(f => f.index)).toEqual([1]);
  });
});

describe('backName', () => {
  it('is the name of the last product of the stack (FR / NL)', () => {
    expect(backName(['p2', 'p1'], 0, LK.products)).toBe('p1-fr');
    expect(backName(['p2', 'p1'], 1, LK.products)).toBe('p1-nl');
  });

  it('is empty without a stack or for an unknown id', () => {
    expect(backName([], 0, LK.products)).toBe('');
    expect(backName(['ghost'], 0, LK.products)).toBe('');
  });
});

describe('sheetVM', () => {
  it('is null when nothing (or an unknown product) is selected', () => {
    expect(sheetVM(null, -1, 0, F)).toBeNull();
    expect(sheetVM('ghost', -1, 0, F)).toBeNull();
  });

  it('builds the whole sheet from the book (FR)', () => {
    const s = sheetVM('p1', 2, 0, F)!;
    expect(s).toMatchObject({
      id: 'p1', name: 'p1-fr', cat: 'Catégorie un', price: '2,50 €', unit: 'pièce', als: ['AAA'],
      avail: "Toute l'année", dlc: 'Jour même', vegan: true, best: true, desc: 'Pain au levain', crossLine: 'Avec une tarte ?',
    });
    expect(s.img).toMatch(/img\/p\/p1\.png$/);
    expect(s.grid.map(a => a.state)).toEqual(['contains', 'traces', 'absent']);
    expect(s.faq.map(f => [f.index, f.open])).toEqual([[0, false], [2, true]]);
    expect(s.cross.map(c => [c.id, c.price])).toEqual([['p2', '4,00 €']]); // the unknown id is skipped
  });

  it('builds the sheet in NL; seasonal product; shelf life in days', () => {
    const s = sheetVM('p2', -1, 1, F)!;
    expect(s).toMatchObject({ name: 'p2-nl', cat: 'Categorie een', avail: 'Lente · maart – april', dlc: '3 dagen', vege: true, seasonName: 'Lente' });
    expect(s.cross.map(c => c.name)).toEqual(['p1-nl']);
    expect(s.faq).toEqual([]);
  });

  it('a repeated cross-sell id gives a repeated pill (as in the prototype)', () => {
    expect(sheetVM('p4', -1, 0, F)!.cross.map(c => c.id)).toEqual(['p1', 'p1']);
  });

  it('an unknown category leaves the eyebrow empty', () => {
    const book = { ...F, products: [product('x', { cat: 'ghost' })] };
    expect(sheetVM('x', -1, 0, book)!.cat).toBe('');
  });
});

describe('BO products (partial, unverified data)', () => {
  const book = (over: Parameters<typeof product>[1]) => ({ ...F, products: [...F.products, product('bo', over)] });

  it('unverified allergens: no "absent" tile (only what is known to be there), the BO text, the flag', () => {
    const vm = sheetVM('bo', -1, 0, book({ al: ['a2'], alKnown: false, trKnown: false, alRaw: ' Contient : lait. ' }))!;
    expect(vm).toMatchObject({ alKnown: false, trKnown: false, alRaw: 'Contient : lait.' });
    expect(vm.grid).toEqual([{ id: 'a2', n: 'Bêta', state: 'contains' }]);
    expect(sheetVM('bo', -1, 0, book({ alKnown: false }))!.grid).toEqual([]);
  });

  it('verified allergens, traces never entered: the full grid, the flag', () => {
    const vm = sheetVM('bo', -1, 0, book({ al: ['a1'], alKnown: true, trKnown: false }))!;
    expect(vm.grid.map(t => t.state)).toEqual(['contains', 'absent', 'absent']);
    expect([vm.alKnown, vm.trKnown, vm.alRaw]).toEqual([true, false, '']);
  });

  it('the sample (flags absent) is verified', () => {
    expect(sheetVM('p1', -1, 0, F)).toMatchObject({ alKnown: true, trKnown: true, alRaw: '' });
  });

  it('empty texts stay empty (the sheet leaves those blocks out); Dutch falls back to French', () => {
    const vm = sheetVM('bo', -1, 1, book({ name: ['Croissant', ''], keep: ['Au sec', ''] }))!;
    expect(vm).toMatchObject({ name: 'Croissant', pitch: '', desc: '', ingr: '', keep: 'Au sec', crossLine: '', cross: [], faq: [] });
  });
});

describe('sample data (prototype golden values)', () => {
  const B = (id: string) => PRODUCTS[id]!;

  it('availability', () => {
    expect(availability(B('croissant'), 0)).toBe("Toute l'année");
    expect(availability(B('brioche'), 0)).toBe('Automne · 15 septembre au 30 novembre');
    expect(availability(B('brioche'), 1)).toBe('Herfst · 15 september t/m 30 november');
  });

  it('allergen grid of the croissant', () => {
    const g = allergenGrid(B('croissant'), 0);
    expect(g.slice(0, 3).map(a => a.n)).toEqual(['Gluten', 'Crustacés', 'Œufs']);
    expect(allergenGrid(B('croissant'), 1).slice(0, 3).map(a => a.n)).toEqual(['Gluten', 'Schaaldieren', 'Eieren']);
    const s = Object.fromEntries(g.map(a => [a.id, a.state]));
    expect(s).toMatchObject({ gluten: 'contains', lait: 'contains', oeufs: 'contains', noix: 'traces', sesame: 'traces' });
    expect(Object.values(s).filter(v => v === 'absent')).toHaveLength(9);
  });

  it('linked FAQ of the orange juice', () => {
    expect(productFaq('jus', -1, 0).map(f => f.index)).toEqual([0, 2]);
    expect(productFaq('jus', -1, 1).map(f => f.q)).toEqual(['Hebben jullie glutenvrije producten?', 'Welke producten zijn vegan?']);
    expect(productFaq('croissant', -1, 0)).toEqual([]);
  });

  it('back button name', () => {
    expect(backName(['cafe', 'croissant'], 0)).toBe('Croissant pur beurre');
    expect(backName(['cafe', 'croissant'], 1)).toBe('Croissant met roomboter');
  });

  it('croissant sheet (FR)', () => {
    const s = sheetVM('croissant', -1, 0)!;
    expect(s).toMatchObject({
      id: 'croissant', name: 'Croissant pur beurre', cat: 'Viennoiseries', price: '1,30 €', unit: 'pièce',
      avail: "Toute l'année", dlc: 'Jour même', vege: true, vegan: false, best: true,
      pitch: 'Il sort du four ce matin, il est encore tout croustillant.',
      crossLine: 'Avec un café, vous avez le petit-déjeuner complet.',
    });
    expect(s.cross.map(c => [c.name, c.price])).toEqual([['Café & latte', '2,80 €'], ["Jus d'orange pressé", '3,90 €']]);
    expect(s.grid).toHaveLength(14);
    expect(s.faq).toEqual([]);
  });

  it('orange juice sheet (NL); shelf life in days', () => {
    const s = sheetVM('jus', 0, 1)!;
    expect(s).toMatchObject({ name: 'Versgeperst sinaasappelsap', cat: 'Dranken', dlc: 'Onmiddellijk', avail: 'Het hele jaar' });
    expect(s.faq.map(f => f.open)).toEqual([true, false]);
    expect(s.cross.map(c => c.name)).toEqual(['Croissant met roomboter', 'Pistolet']);
    expect([sheetVM('campagne', -1, 0)!.dlc, sheetVM('campagne', -1, 1)!.dlc]).toEqual(['5 jours', '5 dagen']);
  });
});

describe('salesArgs', () => {
  it('best seller, season, shelf life, diet — only what the book knows', () => {
    expect(salesArgs(product('x', { best: true, season: 's1', dlc: 1, diet: 'vege' }), 0, LK.seasons)).toEqual([
      'Une de nos meilleures ventes au comptoir.',
      "De la gamme Printemps (mars – avril) : à proposer tant qu'elle est là.",
      "Fait du jour : à savourer aujourd'hui, bien frais.",
      'Végétarien.',
    ]);
    expect(salesArgs(product('y', { dlc: 4, diet: 'vegan' }), 1, LK.seasons)).toEqual([
      'Blijft 4 dagen goed: makkelijk om mee te nemen voor later.', 'Vegan: zonder enig dierlijk product.',
    ]);
    // nothing known: no argument (immediate shelf life, unknown season, no diet)
    expect(salesArgs(product('z', { dlc: 0, season: 'ghost' }), 0, LK.seasons)).toEqual([]);
  });
});

describe('comboVM', () => {
  it('what to offer, then when, nickname and target on one line; products of B as cards', () => {
    const c = comboVM({ with: ['Boissons chaudes', ''], when: ['Matin (avant 11 h)', 'Ochtend (voor 11 u)'], name: ['le petit-déj complet', ''], target: 7.5, items: ['p1', 'ghost'] }, 1, LK);
    expect([c.with, c.meta, c.items.map(i => i.id)]).toEqual([
      'Boissons chaudes', 'Ochtend (voor 11 u) · « le petit-déj complet » · netwerkdoel: 7,5 % van de tickets', ['p1'],
    ]);
    expect(comboVM({ with: ['Cookies', ''], when: ['', ''], name: ['', ''], target: null, items: [] }, 0, LK).meta).toBe('');
  });
});

describe('sheetVM — sales', () => {
  const ctx = { today: new Date(2026, 9, 20, 12), shop: '2' };
  it('combos first, the other cross-sell products after; the bundles of the shop', () => {
    const book = { ...F, products: F.products.map(p => (p.id === 'p2' ? { ...p, cross: ['p1', 'p3'], combos: [{ with: ['B', ''] as const, when: ['', ''] as const, name: ['', ''] as const, target: 10, items: ['p1'] }] } : p)) };
    const vm = sheetVM('p2', -1, 0, book, ctx)!;
    expect(vm.combos.map(c => [c.with, c.meta, c.items.map(i => i.id)])).toEqual([['B', 'objectif réseau : 10 % des tickets', ['p1']]]);
    expect(vm.crossRest.map(c => c.id)).toEqual(['p3']);
    expect(vm.cross.map(c => c.id)).toEqual(['p1', 'p3']);
    // the fixture categories are not in any bundle
    expect(vm.bundles).toEqual([]);
  });
});

describe('isCloseSwipe', () => {
  it('portrait sheet: closes on a downward swipe over 70 px only', () => {
    expect(isCloseSwipe(true, 0, 71)).toBe(true);
    expect(isCloseSwipe(true, 0, 70)).toBe(false);
    expect(isCloseSwipe(true, 200, 10)).toBe(false);
    expect(isCloseSwipe(true, 0, -200)).toBe(false);
  });

  it('portrait sheet: a mostly sideways swipe with some downward drift does not close', () => {
    expect(isCloseSwipe(true, 300, 80)).toBe(false);
    expect(isCloseSwipe(true, -300, 80)).toBe(false);
    expect(isCloseSwipe(true, 60, 120)).toBe(true);
    expect(isCloseSwipe(true, -60, 120)).toBe(true);
  });

  it('side panel: closes on a rightward swipe over 80 px only', () => {
    expect(isCloseSwipe(false, 81, 0)).toBe(true);
    expect(isCloseSwipe(false, 80, 0)).toBe(false);
    expect(isCloseSwipe(false, 0, 200)).toBe(false);
    expect(isCloseSwipe(false, -200, 0)).toBe(false);
  });

  it('side panel: a mostly vertical scroll with some rightward drift does not close', () => {
    expect(isCloseSwipe(false, 90, 250)).toBe(false);
    expect(isCloseSwipe(false, 100, -200)).toBe(false);
    expect(isCloseSwipe(false, 120, 60)).toBe(true);
    expect(isCloseSwipe(false, 120, -60)).toBe(true);
  });
});
