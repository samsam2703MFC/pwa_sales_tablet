import { describe, expect, it } from 'vitest';
import { BOOK } from '../data/book';
import type { FaqItem, Product } from '../data/types';
import { PRODUCTS } from '../lib/catalog';
import {
  allergenGrid, allergenState, availability, backName, isCloseSwipe, productFaq, sheetVM,
} from './drawer.logic';

const P = (id: string): Product => PRODUCTS[id];
const states = (id: string) => Object.fromEntries(allergenGrid(P(id), 0).map(a => [a.id, a.state]));

describe('availability', () => {
  it('"Toute l\'année" for a permanent product (FR / NL)', () => {
    expect(availability(P('croissant'), 0)).toBe("Toute l'année");
    expect(availability(P('croissant'), 1)).toBe('Het hele jaar');
  });

  it('"Season · dates" for a seasonal product (FR / NL)', () => {
    expect(availability(P('brioche'), 0)).toBe('Automne · 15 septembre au 30 novembre');
    expect(availability(P('brioche'), 1)).toBe('Herfst · 15 september t/m 30 november');
  });

  it('every seasonal product gets its season label', () => {
    for (const p of BOOK.products.filter(x => x.season)) {
      expect(availability(p, 0)).toMatch(/^.+ · .+$/);
      expect(availability(p, 0)).not.toBe("Toute l'année");
    }
  });
});

describe('allergenGrid', () => {
  it('lists the 14 allergens in data order, translated', () => {
    expect(allergenGrid(P('croissant'), 0).map(a => a.id)).toEqual(BOOK.allergens.map(a => a.id));
    expect(allergenGrid(P('croissant'), 0).slice(0, 3).map(a => a.n)).toEqual(['Gluten', 'Crustacés', 'Œufs']);
    expect(allergenGrid(P('croissant'), 1).slice(0, 3).map(a => a.n)).toEqual(['Gluten', 'Schaaldieren', 'Eieren']);
  });

  it('marks contains / traces / absent (croissant)', () => {
    const s = states('croissant');
    expect(s).toMatchObject({ gluten: 'contains', lait: 'contains', oeufs: 'contains', noix: 'traces', sesame: 'traces' });
    expect(Object.values(s).filter(v => v === 'absent')).toHaveLength(9);
  });

  it('matches the product data for every product', () => {
    for (const p of BOOK.products) {
      for (const a of allergenGrid(p, 0)) {
        const expected = p.al.includes(a.id) ? 'contains' : p.tr.includes(a.id) ? 'traces' : 'absent';
        expect(a.state).toBe(expected);
      }
    }
  });

  it('"contains" wins when an allergen is listed both as ingredient and trace', () => {
    const p = { ...P('croissant'), al: ['noix'], tr: ['noix'] };
    expect(allergenState(p, 'noix')).toBe('contains');
  });
});

describe('productFaq', () => {
  it('keeps the questions linked to the product, with their BOOK.faq index', () => {
    expect(productFaq('jus', -1, 0).map(f => f.index)).toEqual([0, 2]);
    expect(productFaq('jus', -1, 0).map(f => f.q)).toEqual(['Avez-vous des produits sans gluten ?', 'Quels produits sont vegan ?']);
    expect(productFaq('jus', -1, 1).map(f => f.q)).toEqual(['Hebben jullie glutenvrije producten?', 'Welke producten zijn vegan?']);
  });

  it('is empty when no question mentions the product', () => {
    expect(productFaq('croissant', -1, 0)).toEqual([]);
  });

  it('opens only `selFaq` ("−"), the others show "+"', () => {
    const f = productFaq('jus', 2, 0);
    expect(f.map(x => [x.open, x.sign])).toEqual([[false, '+'], [true, '−']]);
    expect(productFaq('jus', 5, 0).every(x => !x.open && x.sign === '+')).toBe(true);
  });

  it('ignores questions without linked products', () => {
    const faq: FaqItem[] = [{ cat: 'al', q: ['a', 'a'], a: ['b', 'b'] }, { cat: 'al', p: ['x'], q: ['c', 'c'], a: ['d', 'd'] }];
    expect(productFaq('x', -1, 0, faq).map(f => f.index)).toEqual([1]);
  });
});

describe('backName', () => {
  it('is the name of the last product of the stack (FR / NL)', () => {
    expect(backName(['cafe', 'croissant'], 0)).toBe('Croissant pur beurre');
    expect(backName(['cafe', 'croissant'], 1)).toBe('Croissant met roomboter');
  });

  it('is empty without a stack or for an unknown id', () => {
    expect(backName([], 0)).toBe('');
    expect(backName(['nope'], 0)).toBe('');
  });
});

describe('sheetVM', () => {
  it('is null when nothing (or an unknown product) is selected', () => {
    expect(sheetVM(null, -1, 0)).toBeNull();
    expect(sheetVM('nope', -1, 0)).toBeNull();
  });

  it('builds the croissant sheet (FR)', () => {
    const s = sheetVM('croissant', -1, 0)!;
    expect(s).toMatchObject({
      id: 'croissant', name: 'Croissant pur beurre', cat: 'Viennoiseries', price: '1,30 €', unit: 'pièce',
      avail: "Toute l'année", dlc: 'Jour même', vege: true, vegan: false, best: true,
      pitch: 'Il sort du four ce matin, il est encore tout croustillant.',
      crossLine: 'Avec un café, vous avez le petit-déjeuner complet.',
    });
    expect(s.img).toMatch(/img\/p\/croissant\.png$/);
    expect(s.cross.map(c => c.name)).toEqual(['Café & latte', "Jus d'orange pressé"]);
    expect(s.cross.map(c => c.price)).toEqual(['2,80 €', '3,90 €']);
    expect(s.grid).toHaveLength(14);
    expect(s.faq).toEqual([]);
  });

  it('builds the sheet in NL', () => {
    const s = sheetVM('jus', 0, 1)!;
    expect(s).toMatchObject({ name: 'Versgeperst sinaasappelsap', cat: 'Dranken', dlc: 'Onmiddellijk', avail: 'Het hele jaar' });
    expect(s.faq.map(f => f.open)).toEqual([true, false]);
    expect(s.cross.map(c => c.name)).toEqual(['Croissant met roomboter', 'Pistolet']);
  });

  it('shelf life: "n jours" / "n dagen"', () => {
    expect(sheetVM('campagne', -1, 0)!.dlc).toBe('5 jours');
    expect(sheetVM('campagne', -1, 1)!.dlc).toBe('5 dagen');
  });
});

describe('isCloseSwipe', () => {
  it('portrait sheet: closes on a downward swipe over 70 px only', () => {
    expect(isCloseSwipe(true, 0, 71)).toBe(true);
    expect(isCloseSwipe(true, 0, 70)).toBe(false);
    expect(isCloseSwipe(true, 200, 10)).toBe(false);
    expect(isCloseSwipe(true, 0, -200)).toBe(false);
  });

  it('side panel: closes on a rightward swipe over 80 px only', () => {
    expect(isCloseSwipe(false, 81, 0)).toBe(true);
    expect(isCloseSwipe(false, 80, 0)).toBe(false);
    expect(isCloseSwipe(false, 0, 200)).toBe(false);
    expect(isCloseSwipe(false, -200, 0)).toBe(false);
  });
});
