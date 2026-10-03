import { describe, expect, it } from 'vitest';
import { FIXTURE_BOOK as F } from '../test/fixtures';
import { BOOK } from './book';
import type { BookData } from './types';
import { validateBook } from './validate';

/** The fixture book without its deliberate dangling ids ("ghost"): consistent. */
const clean = (): BookData => {
  const b = structuredClone(F);
  b.products[0].cross = ['p2'];
  b.faq[0].p = ['p1'];
  b.combos[0].items = ['p1', 'p1', 'p5'];
  b.stats.sellers[0].top = [['p1', 5], ['p3', 7]];
  return b;
};
/** A consistent book with one change. */
const withChange = (change: (b: BookData) => void): BookData => {
  const b = clean();
  change(b);
  return b;
};
const product = (b: BookData, id: string) => b.products.find(p => p.id === id)!;

describe('validateBook', () => {
  it('the app\'s book is consistent', () => {
    expect(validateBook(BOOK)).toEqual([]);
  });

  it('a consistent book gives no message; the fixture\'s dangling ids are all reported', () => {
    expect(validateBook(clean())).toEqual([]);
    expect(validateBook(F)).toEqual([
      'p1.cross : id inconnu « ghost »',
      'faq[0].p : id inconnu « ghost »',
      'combos[0].items : id inconnu « ghost »',
      'ana.top : id inconnu « ghost »',
    ]);
  });

  it('reports an unknown trace id (the matrix would show the product as OK)', () => {
    const b = withChange(b => { product(b, 'p1').tr = ['a2', 'a4']; });
    expect(validateBook(b)).toEqual(['p1.tr : id inconnu « a4 »']);
  });

  it('reports unknown allergen, season, category and cross-sell ids', () => {
    const b = withChange(b => {
      const p = product(b, 'p1');
      p.al = ['a1', 'a11'];
      p.season = 'hiver';
      p.cat = 'c3';
      p.cross = ['p2', 'p9'];
    });
    expect(validateBook(b)).toEqual([
      'p1.cat : id inconnu « c3 »',
      'p1.season : id inconnu « hiver »',
      'p1.al : id inconnu « a11 »',
      'p1.cross : id inconnu « p9 »',
    ]);
  });

  it('reports an allergen listed both as contained and as traces', () => {
    const b = withChange(b => { product(b, 'p1').tr = ['a2', 'a1']; });
    expect(validateBook(b)).toEqual(['p1 : « a1 » est à la fois dans al et dans tr']);
  });

  it('reports unknown product ids in the FAQ, combos and seller tops, and unknown FAQ categories', () => {
    const b = withChange(b => {
      b.faq[0].p = ['p1', 'p11'];
      b.faq[1].cat = 'divers';
      b.combos[0].items = ['p0'];
      b.stats.sellers[1].top[0][0] = 'xx';
    });
    expect(validateBook(b)).toEqual([
      'faq[0].p : id inconnu « p11 »',
      'faq[1].cat : id inconnu « divers »',
      'combos[0].items : id inconnu « p0 »',
      'bea.top : id inconnu « xx »',
    ]);
  });

  it('reports FAQ sub-categories that are unknown, of another category, or in an unknown category', () => {
    const b = withChange(b => {
      b.faq[2].sub = 'zz';
      b.faq[1].sub = 'qa'; // qa belongs to q1, the question is in q2
      b.faqSubs[1].cat = 'q9';
    });
    expect(validateBook(b)).toEqual([
      'faqSubs.qb.cat : id inconnu « q9 »',
      'faq[1].sub : « qa » appartient à « q1 », pas à « q2 »',
      'faq[2].sub : id inconnu « zz »',
    ]);
  });

  it('reports duplicate and reserved FAQ sub-category ids', () => {
    const b = withChange(b => {
      b.faqSubs.push({ id: 'qa', cat: 'q1', n: ['x', 'x'] }, { id: 'all', cat: 'q1', n: ['Tout', 'Alles'] });
    });
    expect(validateBook(b)).toEqual(['faqSubs : id en double « qa »', 'faqSubs : « all » est réservé (chip « Tout »)']);
  });

  it('reports unknown product ids in the combos of a product', () => {
    const b = withChange(b => { product(b, 'p2').combos = [{ with: ['B', ''], when: ['', ''], name: ['', ''], target: null, items: ['p1', 'p0'] }]; });
    expect(validateBook(b)).toEqual(['p2.combos[0].items : id inconnu « p0 »']);
  });

  it('reports duplicate and reserved ids', () => {
    const b = withChange(b => {
      b.products.push({ ...product(b, 'p5') });
      b.categories.push({ id: 'all', n: ['Tout', 'Alles'] });
      b.faqCats[1].id = 'all';
      b.stats.sellers[1].id = 'team';
    });
    expect(validateBook(b)).toEqual([
      'products : id en double « p5 »',
      'categories : « all » est réservé (chip « Tout »)',
      'faqCats : « all » est réservé (chip « Tout »)',
      'stats.sellers : « team » est réservé (chip « Équipe »)',
      'faq[1].cat : id inconnu « q2 »',
    ]);
  });

  it('reports invalid months and a 7-day chart of the wrong length', () => {
    const b = withChange(b => {
      b.seasons[0].m = [3, 4, 13];
      b.seasons[1].m = [];
      b.stats.sellers[0].bars = [1, 1, 1, 1, 1, 1];
    });
    expect(validateBook(b)).toEqual([
      's1.m : mois attendus de 1 à 12 ([3,4,13])',
      's2.m : mois attendus de 1 à 12 ([])',
      'ana.bars : 7 jours attendus (6)',
    ]);
  });

  it('every illustration of the app\'s book exists in public/', () => {
    const files = new Set(Object.keys(import.meta.glob('/public/img/**/*.png')).map(f => f.replace('/public/', '')));
    const images = [...BOOK.products, ...BOOK.seasons, ...BOOK.services].map(x => x.img);
    expect(images.length).toBeGreaterThan(0);
    expect(images.filter(img => !files.has(img))).toEqual([]);
  });
});
