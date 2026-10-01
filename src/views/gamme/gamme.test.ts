import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { catChips, passesVegan, rangeGroups } from './gamme.logic';

const ids = (cat: string, vegan: boolean) => rangeGroups(cat, vegan, 0).map(g => [g.id, g.items.map(p => p.id)]);

describe('catChips', () => {
  it('starts with "Tout" then the 6 categories (FR)', () => {
    expect(catChips(0).map(c => c.label)).toEqual(['Tout', 'Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(catChips(0).map(c => c.id)).toEqual(['all', 'vien', 'pain', 'pat', 'snack', 'bois', 'saison']);
  });

  it('is translated (NL)', () => {
    expect(catChips(1).map(c => c.label)).toEqual(['Alles', 'Viennoiserie', 'Brood', 'Gebak', 'Snacks', 'Dranken', 'Seizoensproducten']);
  });
});

describe('rangeGroups', () => {
  it('shows every category with all its products by default, in data order', () => {
    const groups = rangeGroups('all', false, 0);
    expect(groups.map(g => g.name)).toEqual(['Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(groups.map(g => g.count)).toEqual([2, 5, 5, 4, 3, 8]);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(BOOK.products.length);
    expect(groups[0].items.map(p => p.id)).toEqual(['croissant', 'painslait']);
  });

  it('count always equals the number of cards', () => {
    for (const cat of ['all', ...BOOK.categories.map(c => c.id)]) {
      for (const vegan of [false, true]) {
        for (const g of rangeGroups(cat, vegan, 0)) expect(g.count).toBe(g.items.length);
      }
    }
  });

  it('keeps only the picked category', () => {
    expect(ids('pain', false)).toEqual([['pain', ['pistolet', 'campagne', 'baguette', 'graines', 'paingris']]]);
    expect(rangeGroups('saison', false, 0).map(g => g.id)).toEqual(['saison']);
  });

  it('VEGAN keeps vegan products only and hides the categories left empty', () => {
    expect(ids('all', true)).toEqual([
      ['pain', ['pistolet', 'campagne', 'baguette', 'graines', 'paingris']],
      ['snack', ['salade']],
      ['bois', ['limonade', 'jus']],
    ]);
    for (const g of rangeGroups('all', true, 0)) expect(g.items.every(p => p.vegan)).toBe(true);
  });

  it('VEGAN + a category without vegan product → nothing', () => {
    expect(rangeGroups('vien', true, 0)).toEqual([]);
    expect(rangeGroups('pat', true, 0)).toEqual([]);
  });

  it('VEGAN + a category with vegan products', () => {
    expect(ids('bois', true)).toEqual([['bois', ['limonade', 'jus']]]);
  });

  it('an unknown category shows nothing', () => {
    expect(rangeGroups('nope', false, 0)).toEqual([]);
  });

  it('translates group titles and cards (NL)', () => {
    const groups = rangeGroups('all', false, 1);
    expect(groups.map(g => g.name)).toEqual(['Viennoiserie', 'Brood', 'Gebak', 'Snacks', 'Dranken', 'Seizoensproducten']);
    expect(groups[0].items[0].name).toBe('Croissant met roomboter');
    expect(rangeGroups('all', false, 0)[0].items[0].name).toBe('Croissant pur beurre');
  });

  it('passesVegan', () => {
    const [vegan, vege] = [BOOK.products.find(p => p.diet === 'vegan')!, BOOK.products.find(p => p.diet === 'vege')!];
    const none = BOOK.products.find(p => p.diet === null)!;
    expect([vegan, vege, none].map(p => passesVegan(p, false))).toEqual([true, true, true]);
    expect([vegan, vege, none].map(p => passesVegan(p, true))).toEqual([true, false, false]);
  });
});
