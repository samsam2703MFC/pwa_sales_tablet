import { describe, expect, it } from 'vitest';
import type { BookData } from '../../data/types';
import { hit, normalizeQuery, search } from './search.logic';

const ids = (q: string) => search(q).products.map(p => p.id);
const faqIdx = (q: string) => search(q).faq.map(x => x.i);

const BUTTER = ['croissant', 'painslait', 'tarteriz', 'tartelette', 'cheesecake', 'cupcake', 'cookie', 'quiche', 'galette', 'nid', 'fraisier', 'brioche', 'speculoos', 'buche'];
const NUTS = ['tartelette', 'cookie', 'galette', 'coeur', 'nid', 'fraisier', 'buche'];

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
    expect(search('')).toEqual({ products: [], faq: [] });
    expect(search('   ')).toEqual({ products: [], faq: [] });
  });

  it('matches ingredients/descriptions case-insensitively, in book order (FR query)', () => {
    expect(ids('beurre')).toEqual(BUTTER);
    expect(ids('BEURRE')).toEqual(BUTTER);
    expect(ids('  beurre  ')).toEqual(BUTTER);
  });

  it('matches NL text too, whatever the UI language (NL query)', () => {
    expect(ids('boter')).toEqual(BUTTER);
  });

  it('matches allergen names in both languages', () => {
    expect(ids('fruits à coque')).toEqual(NUTS);
    expect(ids('noten')).toEqual(NUTS);
    expect(ids('sésame')).toEqual(['graines', 'club', 'salade', 'bowl']);
    expect(ids('sesam')).toEqual(['graines', 'club', 'salade', 'bowl']);
  });

  it('matches product names', () => {
    expect(ids('croissant')).toEqual(['croissant']);
    expect(ids('  CAFÉ ')).toEqual(['cafe']);
  });

  it('finds nothing for unknown words (prototype: "noix" has no hit in the sample data)', () => {
    expect(search('zzz')).toEqual({ products: [], faq: [] });
    expect(search('noix')).toEqual({ products: [], faq: [] });
  });
});

describe('search — FAQ', () => {
  it('matches questions and answers in both languages, keeping the book index', () => {
    expect(faqIdx('gâteau')).toEqual([6]);
    expect(faqIdx('taart')).toEqual([6]);
    expect(faqIdx('acompte')).toEqual([8]);
    expect(faqIdx('voorschot')).toEqual([8]);
    expect(faqIdx('vegan')).toEqual([2]);
    expect(faqIdx('sans')).toEqual([0, 8]);
  });

  it('returns products and questions together', () => {
    const r = search('taart');
    expect(r.products.map(p => p.id)).toEqual(['tarteriz', 'tartelette', 'galette', 'coeur', 'fraisier']);
    expect(r.faq[0].f.q[0]).toBe("Peut-on commander un gâteau d'anniversaire ?");
  });
});

describe('search — custom book', () => {
  it('ignores unknown allergen ids instead of crashing', () => {
    const book = {
      allergens: [], products: [{ id: 'x', name: ['A', 'B'], desc: ['', ''], ingr: ['', ''], al: ['ghost'] }], faq: [],
    } as unknown as BookData;
    expect(search('ghost', book).products).toEqual([]);
    expect(search('b', book).products.map(p => p.id)).toEqual(['x']);
  });
});
