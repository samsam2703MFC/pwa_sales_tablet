import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { FIXTURE_BOOK as F, product } from '../../test/fixtures';
import { consGroups } from './conservation.logic';

describe('consGroups', () => {
  it('every category (data order) with all its products (data order)', () => {
    const g = consGroups(0, F.categories, F.products);
    expect(g.map(x => [x.id, x.name, x.rows.map(r => r.id)])).toEqual([
      ['c1', 'Catégorie un', ['p1', 'p2']],
      ['c2', 'Catégorie deux', ['p3', 'p4', 'p5']],
    ]);
  });

  it('labels the shelf life: 0 → Immédiat, 1 → Jour même, n → "n jours"; keeps the storage advice (FR)', () => {
    const rows = consGroups(0, F.categories, F.products).flatMap(g => g.rows);
    expect(rows.map(r => [r.id, r.dlc])).toEqual([['p1', 'Jour même'], ['p2', '3 jours'], ['p3', '2 jours'], ['p4', 'Immédiat'], ['p5', 'Immédiat']]);
    expect(rows[2]).toEqual({ id: 'p3', name: 'p3-fr', dlc: '2 jours', keep: 'Au frais' });
  });

  it('is translated (NL)', () => {
    const g = consGroups(1, F.categories, F.products);
    expect(g.map(x => x.name)).toEqual(['Categorie een', 'Categorie twee']);
    expect(g[1].rows[0]).toEqual({ id: 'p3', name: 'p3-nl', dlc: '2 dagen', keep: 'Koel' });
    expect(g[0].rows.map(r => r.dlc)).toEqual(['Dezelfde dag', '3 dagen']);
    expect(g[1].rows[1].dlc).toBe('Onmiddellijk');
  });

  it('keeps a category even when it has no product (prototype behaviour)', () => {
    expect(consGroups(0, [{ id: 'x', n: ['Vide', 'Leeg'] }], F.products)).toEqual([{ id: 'x', name: 'Vide', rows: [] }]);
  });

  it('a product of an unknown category is in no group', () => {
    const g = consGroups(0, F.categories, [...F.products, product('stray', { cat: 'ghost' })]);
    expect(g.flatMap(x => x.rows.map(r => r.id))).not.toContain('stray');
  });
});

describe('sample data (prototype golden values)', () => {
  it('categories and counts (FR)', () => {
    const g = consGroups(0);
    expect(g.map(x => x.name)).toEqual(['Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(g.map(x => x.rows.length)).toEqual([2, 5, 5, 4, 3, 8]);
    expect(g.flatMap(x => x.rows.map(r => r.id))).toEqual(
      BOOK.categories.flatMap(c => BOOK.products.filter(p => p.cat === c.id).map(p => p.id)),
    );
  });

  it('rows (FR)', () => {
    const rows = Object.fromEntries(consGroups(0).flatMap(g => g.rows).map(r => [r.id, r]));
    expect([rows.cafe.dlc, rows.croissant.dlc, rows.painslait.dlc, rows.glace.dlc]).toEqual(['Immédiat', 'Jour même', '2 jours', '30 jours']);
    expect(rows.croissant.keep).toBe('À consommer le jour même. 3 min au four à 180 °C pour le raviver.');
    expect(rows.croissant.name).toBe('Croissant pur beurre');
  });

  it('rows (NL)', () => {
    const g = consGroups(1);
    expect(g.map(x => x.name)).toEqual(['Viennoiserie', 'Brood', 'Gebak', 'Snacks', 'Dranken', 'Seizoensproducten']);
    const rows = Object.fromEntries(g.flatMap(x => x.rows).map(r => [r.id, r]));
    expect([rows.jus.dlc, rows.pistolet.dlc, rows.speculoos.dlc]).toEqual(['Onmiddellijk', 'Dezelfde dag', '21 dagen']);
    expect(rows.jus.keep).toBe('Meteen drinken.');
  });
});
