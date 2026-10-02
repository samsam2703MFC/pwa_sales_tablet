import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { FaqItem, Lang } from '../../data/types';
import { initialState, transitions } from '../../state/store';
import { FIXTURE_BOOK as F, FIXTURE_CATALOG as LK } from '../../test/fixtures';
import { faqChips, faqItems, inFaqCat } from './faq.logic';

const items = (cat: string, open: number, lang: Lang = 0, faq: readonly FaqItem[] = F.faq) => faqItems(cat, open, lang, faq, LK);
const idx = (cat: string) => items(cat, -1).map(f => f.index);

describe('faqChips', () => {
  it('starts with "Tout" / "Alles" then every FAQ category, in data order', () => {
    expect(faqChips(0, F.faqCats)).toEqual([{ id: 'all', label: 'Tout' }, { id: 'q1', label: 'Allergies' }, { id: 'q2', label: 'Commandes' }]);
    expect(faqChips(1, F.faqCats).map(c => c.label)).toEqual(['Alles', 'Allergieën', 'Bestellingen']);
  });
});

describe('faqItems — filter', () => {
  it('"all" keeps every question, in data order, with its index in the FAQ', () => {
    expect(idx('all')).toEqual([0, 1, 2]);
  });

  it('a category keeps only its questions, with their original index', () => {
    expect(idx('q1')).toEqual([0, 2]);
    expect(idx('q2')).toEqual([1]);
  });

  it('an unknown category shows nothing', () => {
    expect(items('nope', 0)).toEqual([]);
  });

  it('inFaqCat', () => {
    expect([inFaqCat(F.faq[0], 'all'), inFaqCat(F.faq[0], 'q1'), inFaqCat(F.faq[0], 'q2')]).toEqual([true, true, false]);
  });
});

describe('faqItems — accordion', () => {
  it('only the question at faqOpen is open, with "−"; the others show "+"', () => {
    expect(items('all', 1).map(f => [f.open, f.sign])).toEqual([[false, '+'], [true, '−'], [false, '+']]);
  });

  it('faqOpen = -1 → everything closed', () => {
    expect(items('all', -1).some(f => f.open)).toBe(false);
  });

  it('the open index refers to the whole FAQ, also inside a filtered category', () => {
    expect(items('q1', 2).map(f => f.open)).toEqual([false, true]);
    expect(items('q2', 0).some(f => f.open)).toBe(false); // question 0 is not in q2
  });

  it('works with the store transitions: picking a chip closes the answer, toggling opens one at a time', () => {
    let s = initialState(0);
    expect(s.faqOpen).toBe(0); // the first question starts open, like the prototype
    s = { ...s, ...transitions.setFaqCat('q1')() };
    expect(s).toMatchObject({ faqCat: 'q1', faqOpen: -1 });
    s = { ...s, ...transitions.toggleFaq(0)(s) };
    expect(items(s.faqCat, s.faqOpen).map(f => f.open)).toEqual([true, false]);
    s = { ...s, ...transitions.toggleFaq(2)(s) };
    expect(items(s.faqCat, s.faqOpen).map(f => f.open)).toEqual([false, true]);
    s = { ...s, ...transitions.toggleFaq(2)(s) };
    expect(items(s.faqCat, s.faqOpen).some(f => f.open)).toBe(false);
  });
});

describe('faqItems — content', () => {
  it('translates questions and answers (FR / NL)', () => {
    expect(items('all', -1, 0).map(f => [f.q, f.a])[0]).toEqual(['Question un ?', 'Réponse un']);
    expect(items('q1', -1, 1).map(f => f.q)).toEqual(['Vraag een?', 'Vraag drie?']);
  });

  it('linked products become cards, in the listed order; unknown ids are dropped', () => {
    const [one, two, three] = items('all', -1, 1);
    expect(one.prods.map(p => p.name)).toEqual(['p1-nl']);
    expect(two.hasProds).toBe(false);
    expect(two.prods).toEqual([]);
    expect(three.prods.map(p => p.id)).toEqual(['p3', 'p1']);
  });

  it('a question whose ids all point to nothing still counts as having products (prototype behaviour)', () => {
    const faq: FaqItem[] = [{ cat: 'q1', p: ['nope'], q: ['q', 'q'], a: ['a', 'a'] }, { cat: 'q1', p: [], q: ['q', 'q'], a: ['a', 'a'] }];
    const [a, b] = items('all', -1, 0, faq);
    expect([a.hasProds, a.prods.length]).toEqual([true, 0]);
    expect(b.hasProds).toBe(false);
  });
});

describe('sample data (prototype golden values)', () => {
  it('chips (FR / NL)', () => {
    expect(faqChips(0).map(c => c.id)).toEqual(['all', 'al', 'prod', 'cmd', 'svc']);
    expect(faqChips(0).map(c => c.label)).toEqual(['Tout', 'Allergies & régimes', 'Produits', 'Commandes', 'Services & paiement']);
    expect(faqChips(1).map(c => c.label)).toEqual(['Alles', 'Allergieën & diëten', 'Producten', 'Bestellingen', 'Diensten & betaling']);
  });

  it('questions per category; the categories partition the FAQ', () => {
    const book = (cat: string) => faqItems(cat, -1, 0).map(f => f.index);
    expect(book('all')).toEqual(BOOK.faq.map((_, i) => i));
    expect([book('al'), book('prod'), book('cmd'), book('svc')]).toEqual([[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]]);
    expect(BOOK.faqCats.reduce((n, c) => n + book(c.id).length, 0)).toBe(BOOK.faq.length);
  });

  it('texts and linked products', () => {
    expect(faqItems('all', 0, 0)[0].q).toBe('Avez-vous des produits sans gluten ?');
    expect(faqItems('all', 0, 1)[0].q).toBe('Hebben jullie glutenvrije producten?');
    expect(faqItems('svc', -1, 1).map(f => f.q)).toEqual([
      'Leveren jullie aan huis?',
      'Welke betaalmiddelen aanvaarden jullie?',
      'Is er een getrouwheidskaart?',
    ]);
    const [gluten, severe, vegan] = faqItems('al', -1, 0);
    expect(gluten.prods.map(p => p.name)).toEqual(['Salade quinoa & légumes rôtis', 'Limonade maison', "Jus d'orange pressé"]);
    expect([severe.hasProds, vegan.prods.length]).toEqual([false, 9]);
    expect(faqItems('al', -1, 1)[0].prods.map(p => p.name)[1]).toBe('Huisgemaakte limonade');
  });
});
