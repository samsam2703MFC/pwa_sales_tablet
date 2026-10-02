import { describe, expect, it } from 'vitest';
import type { BookData } from '../../data/types';
import { FIXTURE_BOOK as F, product } from '../../test/fixtures';
import { hit, normalizeQuery, resultsSummary, search } from './search.logic';

const ids = (q: string, book: BookData = F) => search(q, book).products.map(p => p.id);
const faqIdx = (q: string, book: BookData = F) => search(q, book).faq.map(x => x.i);

describe('normalizeQuery / hit', () => {
  it('trims and lower-cases', () => {
    expect(normalizeQuery('  CAFÉ ')).toBe('café');
    expect(normalizeQuery('   ')).toBe('');
  });

  it('checks every language entry', () => {
    expect(hit(['Pain', 'Brood'], 'brood')).toBe(true);
    expect(hit(['Pain', 'Brood'], 'pain')).toBe(true);
    expect(hit(['Pain', 'Brood'], 'zzz')).toBe(false);
    expect(hit(undefined, 'pain')).toBe(false);
  });
});

describe('search — products', () => {
  it('returns nothing for an empty or blank query', () => {
    expect(search('', F)).toEqual({ products: [], faq: [] });
    expect(search('   ', F)).toEqual({ products: [], faq: [] });
  });

  it('matches names, descriptions and ingredients, case-insensitively, in book order', () => {
    expect(ids('P3-FR')).toEqual(['p3']);
    expect(ids('  levain ')).toEqual(['p1']);
    expect(ids('BEURRE')).toEqual(['p2']);
    expect(ids('-fr')).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('matches the other language too, whatever the UI language', () => {
    expect(ids('zuurdesem')).toEqual(['p1']);
    expect(ids('boter')).toEqual(['p2']);
    expect(ids('p3-nl')).toEqual(['p3']);
  });

  it('matches the names of the allergens a product contains (not its traces), in both languages', () => {
    expect(ids('alpha')).toEqual(['p1', 'p2']);
    expect(ids('alfa')).toEqual(['p1', 'p2']);
    expect(ids('gamma')).toEqual(['p4']); // p3 only has traces of it
  });

  it('finds nothing for unknown words', () => {
    expect(search('zzz', F)).toEqual({ products: [], faq: [] });
  });

  it('ignores unknown allergen ids instead of crashing', () => {
    const book = { ...F, products: [product('x', { al: ['ghost'] })] };
    expect(ids('ghost', book)).toEqual([]);
    expect(ids('x-nl', book)).toEqual(['x']);
  });
});

describe('search — FAQ', () => {
  it('matches questions and answers in both languages, keeping the book index', () => {
    expect(faqIdx('question deux')).toEqual([1]);
    expect(faqIdx('ANTWOORD')).toEqual([0, 2]);
    expect(faqIdx('vraag')).toEqual([0, 1, 2]);
  });

  it('returns products and questions together', () => {
    const r = search('beurre', F);
    expect(r.products.map(p => p.id)).toEqual(['p2']);
    expect(r.faq).toEqual([{ f: F.faq[1], i: 1 }]);
  });
});

describe('resultsSummary', () => {
  const r = (p: number, f: number) => ({ products: F.products.slice(0, p), faq: F.faq.slice(0, f).map((x, i) => ({ f: x, i })) });

  it('counts products and questions, with French plurals (0 and 1 are singular)', () => {
    expect(resultsSummary(r(2, 1), 0, 'Aucun résultat.')).toBe('2 produits, 1 question');
    expect(resultsSummary(r(1, 0), 0, 'Aucun résultat.')).toBe('1 produit, 0 question');
    expect(resultsSummary(r(0, 3), 0, 'Aucun résultat.')).toBe('0 produit, 3 questions');
  });

  it('Dutch plurals', () => {
    expect(resultsSummary(r(1, 1), 1, 'Geen resultaten.')).toBe('1 product, 1 vraag');
    expect(resultsSummary(r(5, 0), 1, 'Geen resultaten.')).toBe('5 producten, 0 vragen');
  });

  it('no result → the "no result" sentence', () => {
    expect(resultsSummary(r(0, 0), 0, 'Aucun résultat.')).toBe('Aucun résultat.');
  });
});

describe('sample data (prototype golden values)', () => {
  const BUTTER = ['croissant', 'painslait', 'tarteriz', 'tartelette', 'cheesecake', 'cupcake', 'cookie', 'quiche', 'galette', 'nid', 'fraisier', 'brioche', 'speculoos', 'buche'];
  const NUTS = ['tartelette', 'cookie', 'galette', 'coeur', 'nid', 'fraisier', 'buche'];
  const book = (q: string) => search(q).products.map(p => p.id);

  it('butter (FR / NL query)', () => {
    expect(book('beurre')).toEqual(BUTTER);
    expect(book('boter')).toEqual(BUTTER);
  });

  it('allergen names', () => {
    expect(book('fruits à coque')).toEqual(NUTS);
    expect(book('noten')).toEqual(NUTS);
    expect(book('sésame')).toEqual(['graines', 'club', 'salade', 'bowl']);
    expect(book('sesam')).toEqual(['graines', 'club', 'salade', 'bowl']);
  });

  it('product names; "noix" has no hit (as in the prototype)', () => {
    expect(book('croissant')).toEqual(['croissant']);
    expect(book('  CAFÉ ')).toEqual(['cafe']);
    expect(search('noix')).toEqual({ products: [], faq: [] });
  });

  it('FAQ', () => {
    const idx = (q: string) => search(q).faq.map(x => x.i);
    expect(idx('gâteau')).toEqual([6]);
    expect(idx('taart')).toEqual([6]);
    expect(idx('acompte')).toEqual([8]);
    expect(idx('voorschot')).toEqual([8]);
    expect(idx('vegan')).toEqual([2]);
    expect(idx('sans')).toEqual([0, 8]);
    const r = search('taart');
    expect(r.products.map(p => p.id)).toEqual(['tarteriz', 'tartelette', 'galette', 'coeur', 'fraisier']);
    expect(r.faq[0].f.q[0]).toBe("Peut-on commander un gâteau d'anniversaire ?");
  });
});
