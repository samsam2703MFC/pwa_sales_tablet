import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { FIXTURE_BOOK as F } from '../../test/fixtures';
import { catChips, passesVegan, rangeGroups } from './gamme.logic';

const groups = (cat: string, vegan: boolean, lang: 0 | 1 = 0) => rangeGroups(cat, vegan, lang, F.categories, F.products);
const ids = (cat: string, vegan: boolean) => groups(cat, vegan).map(g => [g.id, g.items.map(p => p.id)]);

describe('catChips', () => {
  it('starts with "Tout" / "Alles" then every category, in data order', () => {
    expect(catChips(0, F.categories)).toEqual([
      { id: 'all', label: 'Tout' }, { id: 'c1', label: 'Catégorie un' }, { id: 'c2', label: 'Catégorie deux' },
    ]);
    expect(catChips(1, F.categories).map(c => c.label)).toEqual(['Alles', 'Categorie een', 'Categorie twee']);
  });
});

describe('rangeGroups', () => {
  it('shows every category with all its products by default, in data order', () => {
    expect(ids('all', false)).toEqual([['c1', ['p1', 'p2']], ['c2', ['p3', 'p4', 'p5']]]);
    expect(groups('all', false).map(g => [g.name, g.count])).toEqual([['Catégorie un', 2], ['Catégorie deux', 3]]);
  });

  it('count always equals the number of cards', () => {
    for (const cat of ['all', 'c1', 'c2']) {
      for (const vegan of [false, true]) for (const g of groups(cat, vegan)) expect(g.count).toBe(g.items.length);
    }
  });

  it('keeps only the picked category', () => {
    expect(ids('c2', false)).toEqual([['c2', ['p3', 'p4', 'p5']]]);
  });

  it('VEGAN keeps vegan products only (not vegetarian ones) and hides the categories left empty', () => {
    expect(ids('all', true)).toEqual([['c1', ['p1']], ['c2', ['p5']]]);
    const noVeganInC1 = F.products.map(p => (p.cat === 'c1' ? { ...p, diet: null } : p));
    expect(rangeGroups('all', true, 0, F.categories, noVeganInC1).map(g => g.id)).toEqual(['c2']);
    expect(rangeGroups('c1', true, 0, F.categories, noVeganInC1)).toEqual([]);
  });

  it('an unknown category shows nothing; a product of an unknown category is in no group', () => {
    expect(groups('nope', false)).toEqual([]);
    const stray = [...F.products, { ...F.products[0], id: 'stray', cat: 'ghost' }];
    expect(rangeGroups('all', false, 0, F.categories, stray).flatMap(g => g.items.map(p => p.id))).not.toContain('stray');
  });

  it('translates group titles and cards (NL)', () => {
    const nl = groups('all', false, 1);
    expect(nl.map(g => g.name)).toEqual(['Categorie een', 'Categorie twee']);
    expect(nl[0].items.map(p => p.name)).toEqual(['p1-nl', 'p2-nl']);
  });

  it('passesVegan', () => {
    const [vegan, vege, none] = [F.products[0], F.products[1], F.products[2]];
    expect([vegan.diet, vege.diet, none.diet]).toEqual(['vegan', 'vege', null]);
    expect([vegan, vege, none].map(p => passesVegan(p, false))).toEqual([true, true, true]);
    expect([vegan, vege, none].map(p => passesVegan(p, true))).toEqual([true, false, false]);
  });
});

describe('sample data (prototype golden values)', () => {
  it('category chips (FR / NL)', () => {
    expect(catChips(0).map(c => c.label)).toEqual(['Tout', 'Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(catChips(0).map(c => c.id)).toEqual(['all', 'vien', 'pain', 'pat', 'snack', 'bois', 'saison']);
    expect(catChips(1).map(c => c.label)).toEqual(['Alles', 'Viennoiserie', 'Brood', 'Gebak', 'Snacks', 'Dranken', 'Seizoensproducten']);
  });

  it('every category, counts and first products', () => {
    const g = rangeGroups('all', false, 0);
    expect(g.map(x => x.name)).toEqual(['Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(g.map(x => x.count)).toEqual([2, 5, 5, 4, 3, 8]);
    expect(g.reduce((n, x) => n + x.count, 0)).toBe(BOOK.products.length);
    expect(g[0].items.map(p => p.id)).toEqual(['croissant', 'painslait']);
    expect(g[0].items[0].name).toBe('Croissant pur beurre');
    expect(rangeGroups('all', false, 1)[0].items[0].name).toBe('Croissant met roomboter');
  });

  it('VEGAN', () => {
    const v = rangeGroups('all', true, 0).map(x => [x.id, x.items.map(p => p.id)]);
    expect(v).toEqual([
      ['pain', ['pistolet', 'campagne', 'baguette', 'graines', 'paingris']],
      ['snack', ['salade']],
      ['bois', ['limonade', 'jus']],
    ]);
    expect(rangeGroups('vien', true, 0)).toEqual([]);
  });
});
