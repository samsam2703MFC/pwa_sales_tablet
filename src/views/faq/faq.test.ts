import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { FaqItem } from '../../data/types';
import { initialState, transitions } from '../../state/store';
import { faqChips, faqItems, inFaqCat } from './faq.logic';

const idx = (cat: string) => faqItems(cat, -1, 0).map(f => f.index);

describe('faqChips', () => {
  it('starts with "Tout" then the 4 FAQ categories (FR)', () => {
    expect(faqChips(0).map(c => c.id)).toEqual(['all', 'al', 'prod', 'cmd', 'svc']);
    expect(faqChips(0).map(c => c.label)).toEqual(['Tout', 'Allergies & régimes', 'Produits', 'Commandes', 'Services & paiement']);
  });

  it('is translated (NL)', () => {
    expect(faqChips(1).map(c => c.label)).toEqual(['Alles', 'Allergieën & diëten', 'Producten', 'Bestellingen', 'Diensten & betaling']);
  });
});

describe('faqItems — filter', () => {
  it('"all" keeps every question, in data order, with its BOOK.faq index', () => {
    expect(idx('all')).toEqual(BOOK.faq.map((_, i) => i));
  });

  it('a category keeps only its questions, with their original index', () => {
    expect(idx('al')).toEqual([0, 1, 2]);
    expect(idx('prod')).toEqual([3, 4, 5]);
    expect(idx('cmd')).toEqual([6, 7, 8]);
    expect(idx('svc')).toEqual([9, 10, 11]);
    for (const c of BOOK.faqCats) {
      for (const f of faqItems(c.id, -1, 0)) expect(BOOK.faq[f.index].cat).toBe(c.id);
    }
  });

  it('the categories partition the whole FAQ', () => {
    const n = BOOK.faqCats.reduce((a, c) => a + idx(c.id).length, 0);
    expect(n).toBe(BOOK.faq.length);
  });

  it('an unknown category shows nothing', () => {
    expect(faqItems('nope', 0, 0)).toEqual([]);
  });

  it('inFaqCat', () => {
    const f = BOOK.faq[0];
    expect([inFaqCat(f, 'all'), inFaqCat(f, 'al'), inFaqCat(f, 'prod')]).toEqual([true, true, false]);
  });
});

describe('faqItems — accordion', () => {
  it('only the question at faqOpen is open, with "−"; the others show "+"', () => {
    const items = faqItems('all', 0, 0);
    expect(items.map(f => f.open)).toEqual(items.map((_, i) => i === 0));
    expect(items[0].sign).toBe('−');
    expect(items.slice(1).every(f => f.sign === '+')).toBe(true);
  });

  it('faqOpen = -1 → everything closed', () => {
    expect(faqItems('all', -1, 0).some(f => f.open)).toBe(false);
  });

  it('the open index refers to BOOK.faq, also inside a filtered category', () => {
    expect(faqItems('prod', 4, 0).map(f => f.open)).toEqual([false, true, false]);
    // question 0 is not in "Commandes": nothing open there
    expect(faqItems('cmd', 0, 0).some(f => f.open)).toBe(false);
  });

  it('works with the store transitions: picking a chip closes the answer, toggling opens one at a time', () => {
    let s = initialState(0);
    expect(s.faqOpen).toBe(0); // the first question starts open, like the prototype
    s = { ...s, ...transitions.setFaqCat('cmd')() };
    expect(s).toMatchObject({ faqCat: 'cmd', faqOpen: -1 });
    s = { ...s, ...transitions.toggleFaq(7)(s) };
    expect(faqItems(s.faqCat, s.faqOpen, 0).map(f => f.open)).toEqual([false, true, false]);
    s = { ...s, ...transitions.toggleFaq(8)(s) };
    expect(faqItems(s.faqCat, s.faqOpen, 0).map(f => f.open)).toEqual([false, false, true]);
    s = { ...s, ...transitions.toggleFaq(8)(s) };
    expect(faqItems(s.faqCat, s.faqOpen, 0).some(f => f.open)).toBe(false);
  });
});

describe('faqItems — content', () => {
  it('translates questions and answers (FR / NL)', () => {
    expect(faqItems('all', 0, 0)[0].q).toBe('Avez-vous des produits sans gluten ?');
    expect(faqItems('all', 0, 1)[0].q).toBe('Hebben jullie glutenvrije producten?');
    expect(faqItems('svc', -1, 1).map(f => f.q)).toEqual([
      'Leveren jullie aan huis?',
      'Welke betaalmiddelen aanvaarden jullie?',
      'Is er een getrouwheidskaart?',
    ]);
  });

  it('linked products become cards, in the listed order', () => {
    const [gluten, severe, vegan] = faqItems('al', -1, 0);
    expect(gluten.hasProds).toBe(true);
    expect(gluten.prods.map(p => p.name)).toEqual(['Salade quinoa & légumes rôtis', 'Limonade maison', "Jus d'orange pressé"]);
    expect(severe.hasProds).toBe(false);
    expect(severe.prods).toEqual([]);
    expect(vegan.prods).toHaveLength(9);
    expect(faqItems('al', -1, 1)[0].prods.map(p => p.name)[1]).toBe('Huisgemaakte limonade');
  });

  it('unknown product ids are dropped but still count for hasProds (prototype behaviour)', () => {
    const faq: FaqItem[] = [{ cat: 'al', p: ['nope'], q: ['q', 'q'], a: ['a', 'a'] }, { cat: 'al', p: [], q: ['q', 'q'], a: ['a', 'a'] }];
    const [a, b] = faqItems('all', -1, 0, faq);
    expect([a.hasProds, a.prods.length]).toEqual([true, 0]);
    expect(b.hasProds).toBe(false);
  });
});
