import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import { consGroups } from './conservation.logic';

describe('consGroups', () => {
  it('has every category with all its products, in data order (FR)', () => {
    const g = consGroups(0);
    expect(g.map(x => x.name)).toEqual(['Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(g.map(x => x.rows.length)).toEqual([2, 5, 5, 4, 3, 8]);
    expect(g.flatMap(x => x.rows.map(r => r.id))).toEqual(
      BOOK.categories.flatMap(c => BOOK.products.filter(p => p.cat === c.id).map(p => p.id)),
    );
  });

  it('labels the shelf life: 0 → Immédiat, 1 → Jour même, n → "n jours" (FR)', () => {
    const rows = Object.fromEntries(consGroups(0).flatMap(g => g.rows).map(r => [r.id, r]));
    expect(rows.cafe.dlc).toBe('Immédiat');
    expect(rows.croissant.dlc).toBe('Jour même');
    expect(rows.painslait.dlc).toBe('2 jours');
    expect(rows.glace.dlc).toBe('30 jours');
    expect(rows.croissant.keep).toBe('À consommer le jour même. 3 min au four à 180 °C pour le raviver.');
    expect(rows.croissant.name).toBe('Croissant pur beurre');
  });

  it('is translated (NL)', () => {
    const g = consGroups(1);
    expect(g.map(x => x.name)).toEqual(['Viennoiserie', 'Brood', 'Gebak', 'Snacks', 'Dranken', 'Seizoensproducten']);
    const rows = Object.fromEntries(g.flatMap(x => x.rows).map(r => [r.id, r]));
    expect([rows.jus.dlc, rows.pistolet.dlc, rows.speculoos.dlc]).toEqual(['Onmiddellijk', 'Dezelfde dag', '21 dagen']);
    expect(rows.jus.keep).toBe('Meteen drinken.');
  });

  it('keeps a category even when it has no product (prototype behaviour)', () => {
    const g = consGroups(0, [{ id: 'x', n: ['Vide', 'Leeg'] }], BOOK.products);
    expect(g).toEqual([{ id: 'x', name: 'Vide', rows: [] }]);
  });
});
