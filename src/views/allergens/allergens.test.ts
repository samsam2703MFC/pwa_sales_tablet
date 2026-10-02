import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { Allergen, Product } from '../../data/types';
import { product } from '../../test/fixtures';
import { alA11y, allergenMatrix, allergenStatus } from './allergens.logic';

/** Minimal product for focused tests. */
const prod = (id: string, al: string[], tr: string[]): Product => product(id, { al, tr });

const ALS: Allergen[] = [
  { id: 'gluten', n: ['Gluten', 'Gluten'], s: 'GLU' },
  { id: 'lait', n: ['Lait', 'Melk'], s: 'LAI' },
  { id: 'noix', n: ['Fruits à coque', 'Noten'], s: 'NOI' },
];
const PRODS = [
  prod('a', ['gluten', 'lait'], ['noix']), // contains gluten + milk, traces of nuts
  prod('b', ['gluten'], []),              // contains gluten only
  prod('c', [], ['gluten']),              // traces of gluten
  prod('d', [], []),                      // allergen free
];

/** Reference implementation: the prototype's renderVals, verbatim. */
function reference(ex: string[]) {
  let okCount = 0, warnCount = 0;
  const rows = BOOK.products.map(x => {
    const bad = ex.some(e => x.al.includes(e)), warn = !bad && ex.some(e => x.tr.includes(e)), ok = ex.length > 0 && !bad && !warn;
    if (ok) okCount++; if (ex.length && warn) warnCount++;
    return { op: ex.length && bad ? 0.3 : 1, ok, warn: ex.length > 0 && warn };
  });
  return { rows, okCount, warnCount };
}

describe('allergenStatus', () => {
  it('no selection: neither OK, traces nor dimmed', () => {
    for (const p of PRODS) expect(allergenStatus(p, [])).toEqual({ bad: false, warn: false, ok: false, unknown: false });
  });

  it('contains an excluded allergen → bad (contains wins over traces)', () => {
    expect(allergenStatus(PRODS[0], ['noix', 'lait'])).toEqual({ bad: true, warn: false, ok: false, unknown: false });
    expect(allergenStatus(PRODS[1], ['gluten'])).toEqual({ bad: true, warn: false, ok: false, unknown: false });
  });

  it('only traces of an excluded allergen → warn', () => {
    expect(allergenStatus(PRODS[0], ['noix'])).toEqual({ bad: false, warn: true, ok: false, unknown: false });
    expect(allergenStatus(PRODS[2], ['gluten'])).toEqual({ bad: false, warn: true, ok: false, unknown: false });
  });

  it('nothing excluded present → ok', () => {
    expect(allergenStatus(PRODS[3], ['gluten', 'lait', 'noix'])).toEqual({ bad: false, warn: false, ok: true, unknown: false });
    expect(allergenStatus(PRODS[1], ['lait'])).toEqual({ bad: false, warn: false, ok: true, unknown: false });
  });

  it('multi-selection: any excluded allergen counts', () => {
    // traces of gluten + nothing for milk → warn
    expect(allergenStatus(PRODS[2], ['lait', 'gluten'])).toEqual({ bad: false, warn: true, ok: false, unknown: false });
    // contains gluten even though milk is absent → bad
    expect(allergenStatus(PRODS[1], ['lait', 'gluten'])).toEqual({ bad: true, warn: false, ok: false, unknown: false });
  });

  it('allergens outside the selection are ignored', () => {
    expect(allergenStatus(PRODS[0], ['soja'])).toEqual({ bad: false, warn: false, ok: true, unknown: false });
  });
});

describe('allergenMatrix (fixture)', () => {
  it('counts OK and traces products', () => {
    const m = allergenMatrix(0, ['gluten'], PRODS, ALS);
    expect(m.rows.map(r => [r.id, r.bad, r.warn, r.ok])).toEqual([
      ['a', true, false, false],
      ['b', true, false, false],
      ['c', false, true, false],
      ['d', false, false, true],
    ]);
    expect(m.okCount).toBe(1);
    expect(m.warnCount).toBe(1);
    expect(m.hasEx).toBe(true);
  });

  it('cells: contains / traces / checked column', () => {
    const m = allergenMatrix(0, ['noix'], PRODS, ALS);
    expect(m.rows[0].cells).toEqual([
      { id: 'gluten', contains: true, traces: false, unknown: false, on: false },
      { id: 'lait', contains: true, traces: false, unknown: false, on: false },
      { id: 'noix', contains: false, traces: true, unknown: false, on: true },
    ]);
    expect(m.rows[3].cells.every(c => !c.contains && !c.traces)).toBe(true);
  });

  it('chips and headers follow the selection, translated', () => {
    const fr = allergenMatrix(0, ['lait', 'noix'], PRODS, ALS);
    expect(fr.chips).toEqual([
      { id: 'gluten', name: 'Gluten', on: false },
      { id: 'lait', name: 'Lait', on: true },
      { id: 'noix', name: 'Fruits à coque', on: true },
    ]);
    expect(fr.headers.map(h => [h.code, h.name, h.on])).toEqual([['GLU', 'Gluten', false], ['LAI', 'Lait', true], ['NOI', 'Fruits à coque', true]]);
    const nl = allergenMatrix(1, ['lait'], PRODS, ALS);
    expect(nl.chips.map(c => c.name)).toEqual(['Gluten', 'Melk', 'Noten']);
    expect(nl.headers.map(h => h.code)).toEqual(['GLU', 'LAI', 'NOI']);
    expect(nl.rows.map(r => r.name)).toEqual(['a-nl', 'b-nl', 'c-nl', 'd-nl']);
  });

  it('empty selection: no counts, nothing dimmed', () => {
    const m = allergenMatrix(0, [], PRODS, ALS);
    expect(m.hasEx).toBe(false);
    expect([m.okCount, m.warnCount]).toEqual([0, 0]);
    expect(m.rows.some(r => r.bad || r.warn || r.ok)).toBe(false);
    expect(m.headers.some(h => h.on)).toBe(false);
  });
});

describe('unverified BO data (alKnown / trKnown false)', () => {
  /** No allergen entered yet in the BO (the phase-1 BO book: al [], alKnown false, trKnown false). */
  const unverified = product('u', { al: [], tr: [], alKnown: false, trKnown: false });
  /** Partly known: contains gluten, the rest unverified. */
  const partly = product('g', { al: ['gluten'], alKnown: false, trKnown: false });
  /** Allergens verified, traces never entered. */
  const noTraces = product('t', { al: ['lait'], alKnown: true, trKnown: false });

  it('a product whose allergens are unverified is never OK: "à vérifier", with or without a selection', () => {
    for (const ex of [[], ['gluten'], ['lait', 'noix'], ['soja']]) {
      expect(allergenStatus(unverified, ex)).toEqual({ bad: false, warn: false, ok: false, unknown: true });
    }
  });

  it('…unless it is known to contain an excluded allergen: bad', () => {
    expect(allergenStatus(partly, ['gluten'])).toEqual({ bad: true, warn: false, ok: false, unknown: false });
    expect(allergenStatus(partly, ['lait'])).toEqual({ bad: false, warn: false, ok: false, unknown: true });
  });

  it('traces never entered: at most "traces", never OK', () => {
    expect(allergenStatus(noTraces, ['gluten'])).toEqual({ bad: false, warn: true, ok: false, unknown: false });
    expect(allergenStatus(noTraces, ['lait'])).toEqual({ bad: true, warn: false, ok: false, unknown: false });
    expect(allergenStatus(noTraces, [])).toEqual({ bad: false, warn: false, ok: false, unknown: false });
  });

  it('absent flags (the sample) keep the prototype rules', () => {
    expect(allergenStatus(product('s', { al: [], tr: [] }), ['gluten'])).toEqual({ bad: false, warn: false, ok: true, unknown: false });
  });

  it('matrix: "?" cells instead of empty ones, counted apart, never in the OK count', () => {
    const m = allergenMatrix(0, ['noix'], [...PRODS, unverified, partly], ALS);
    expect(m.rows.map(r => [r.id, r.ok, r.warn, r.bad, r.unknown])).toEqual([
      ['a', false, true, false, false],
      ['b', true, false, false, false],
      ['c', true, false, false, false],
      ['d', true, false, false, false],
      ['u', false, false, false, true],
      ['g', false, false, false, true],
    ]);
    expect([m.okCount, m.warnCount, m.unknownCount]).toEqual([3, 1, 2]);
    expect(m.rows[4].cells.map(c => c.unknown)).toEqual([true, true, true]);
    // what is known stays shown: contains gluten, "?" elsewhere
    expect(m.rows[5].cells.map(c => [c.contains, c.unknown])).toEqual([[true, false], [false, true], [false, true]]);
    // verified products never get a "?"
    expect(m.rows.slice(0, 4).every(r => r.cells.every(c => !c.unknown))).toBe(true);
  });

  it('the sample book has no unverified product', () => {
    expect(allergenMatrix(0, ['gluten']).unknownCount).toBe(0);
  });
});

describe('allergenMatrix (book data)', () => {
  it('lists the 14 allergens in data order and every product', () => {
    const m = allergenMatrix(0, []);
    expect(m.headers.map(h => h.code)).toEqual(['GLU', 'CRU', 'ŒUF', 'POI', 'ARA', 'SOJ', 'LAI', 'NOI', 'CEL', 'MOU', 'SES', 'SUL', 'LUP', 'MOL']);
    expect(m.chips.map(c => c.name)).toEqual([
      'Gluten', 'Crustacés', 'Œufs', 'Poisson', 'Arachides', 'Soja', 'Lait', 'Fruits à coque',
      'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques',
    ]);
    expect(allergenMatrix(1, []).chips.map(c => c.name)).toEqual([
      'Gluten', 'Schaaldieren', 'Eieren', 'Vis', 'Pinda', 'Soja', 'Melk', 'Noten',
      'Selderij', 'Mosterd', 'Sesam', 'Sulfiet', 'Lupine', 'Weekdieren',
    ]);
    expect(m.rows.map(r => r.id)).toEqual(BOOK.products.map(p => p.id));
    expect(m.rows.every(r => r.cells.length === 14)).toBe(true);
  });

  it.each([
    [[]],
    [['gluten']],
    [['lait']],
    [['lait', 'noix', 'arach']],
    [['noix', 'arach']],
    [['sesame', 'soja']],
    [['crust']],
    [['gluten', 'lait', 'oeufs', 'noix', 'arach', 'soja', 'sesame', 'celeri', 'moutarde', 'sulfites']],
  ])('matches the prototype rules for %j', ex => {
    const ref = reference(ex);
    const m = allergenMatrix(0, ex);
    expect(m.okCount).toBe(ref.okCount);
    expect(m.warnCount).toBe(ref.warnCount);
    expect(m.rows.map(r => ({ op: r.bad ? 0.3 : 1, ok: r.ok, warn: r.warn }))).toEqual(ref.rows);
  });

  it('gluten: only the gluten-free products are OK; traces counted apart', () => {
    const m = allergenMatrix(0, ['gluten']);
    const ok = m.rows.filter(r => r.ok).map(r => r.id);
    const warn = m.rows.filter(r => r.warn).map(r => r.id);
    const expOk = BOOK.products.filter(p => !p.al.includes('gluten') && !p.tr.includes('gluten')).map(p => p.id);
    const expWarn = BOOK.products.filter(p => !p.al.includes('gluten') && p.tr.includes('gluten')).map(p => p.id);
    expect(ok).toEqual(expOk);
    expect(warn).toEqual(expWarn);
    expect(m.okCount).toBe(expOk.length);
    expect(m.warnCount).toBe(expWarn.length);
    expect(m.headers.filter(h => h.on).map(h => h.code)).toEqual(['GLU']);
    // every cell of the gluten column is highlighted, no other column
    expect(m.rows.every(r => r.cells.every(c => c.on === (c.id === 'gluten')))).toBe(true);
  });

  it('home quick-ask "sans fruits à coque" (noix + arachides)', () => {
    const m = allergenMatrix(0, ['noix', 'arach']);
    for (const r of m.rows) {
      const p = BOOK.products.find(x => x.id === r.id)!;
      const contains = p.al.includes('noix') || p.al.includes('arach');
      const traces = p.tr.includes('noix') || p.tr.includes('arach');
      expect(r.bad).toBe(contains);
      expect(r.warn).toBe(!contains && traces);
      expect(r.ok).toBe(!contains && !traces);
    }
    expect(m.okCount + m.warnCount + m.rows.filter(r => r.bad).length).toBe(BOOK.products.length);
  });

  it('selection order does not matter', () => {
    const a = allergenMatrix(0, ['lait', 'noix', 'arach']);
    const b = allergenMatrix(0, ['arach', 'lait', 'noix']);
    expect(b.rows.map(r => [r.ok, r.warn, r.bad])).toEqual(a.rows.map(r => [r.ok, r.warn, r.bad]));
    expect([b.okCount, b.warnCount]).toEqual([a.okCount, a.warnCount]);
  });
});

describe('alA11y', () => {
  it('has FR and NL labels', () => {
    expect(alA11y(0).bad).toBe('Ne convient pas');
    expect(alA11y(1).bad).toBe('Niet geschikt');
    expect(alA11y(1).status).toBe('Status');
  });
});
