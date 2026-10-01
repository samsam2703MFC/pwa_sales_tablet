import { BOOK } from '../../data/book';
import type { Allergen, Lang, Product } from '../../data/types';
import { tr } from '../../lib/catalog';

/**
 * Allergen matrix view model — the prototype's alChips / alHdr / alRows / okCount / warnCount.
 * `ex` = ids of the allergens the customer is allergic to (multi-selection).
 */

/** Filter chip (one per allergen). */
export interface AlChipVM {
  id: string;
  /** Full name in the current language. */
  name: string;
  on: boolean;
}

/** Matrix column header: 3-letter code + full name (tooltip / accessible name). */
export interface AlHeaderVM {
  id: string;
  code: string;
  name: string;
  /** Allergen checked in the filter → highlighted column. */
  on: boolean;
}

/** One matrix cell (product × allergen). */
export interface AlCellVM {
  id: string;
  contains: boolean;
  traces: boolean;
  /** Column of a checked allergen. */
  on: boolean;
}

export interface AlRowVM {
  id: string;
  name: string;
  /** Contains at least one excluded allergen → dimmed row. */
  bad: boolean;
  /** "Traces" pill: no excluded allergen, but traces of one. */
  warn: boolean;
  /** "OK" pill: a selection exists and the product neither contains nor may contain it. */
  ok: boolean;
  cells: AlCellVM[];
}

export interface AlMatrixVM {
  hasEx: boolean;
  chips: AlChipVM[];
  headers: AlHeaderVM[];
  rows: AlRowVM[];
  /** Products marked OK. */
  okCount: number;
  /** Products marked "Traces". */
  warnCount: number;
}

export type AlStatus = Pick<AlRowVM, 'bad' | 'warn' | 'ok'>;

/** Compatibility of a product with the excluded allergens (exactly the prototype's rules). */
export function allergenStatus(p: Pick<Product, 'al' | 'tr'>, ex: readonly string[]): AlStatus {
  const bad = ex.some(e => p.al.includes(e));
  const warn = !bad && ex.some(e => p.tr.includes(e));
  const ok = ex.length > 0 && !bad && !warn;
  return { bad, warn, ok };
}

/** Builds the whole view model. Products and allergens keep the data order. */
export function allergenMatrix(
  lang: Lang,
  ex: readonly string[],
  products: readonly Product[] = BOOK.products,
  allergens: readonly Allergen[] = BOOK.allergens,
): AlMatrixVM {
  const isOn = (a: Allergen) => ex.includes(a.id);
  const chips = allergens.map(a => ({ id: a.id, name: tr(a.n, lang), on: isOn(a) }));
  const headers = allergens.map(a => ({ id: a.id, code: a.s, name: tr(a.n, lang), on: isOn(a) }));
  let okCount = 0;
  let warnCount = 0;
  const rows = products.map(p => {
    const st = allergenStatus(p, ex);
    if (st.ok) okCount++;
    if (st.warn) warnCount++;
    return {
      id: p.id,
      name: tr(p.name, lang),
      ...st,
      cells: allergens.map(a => ({
        id: a.id, contains: p.al.includes(a.id), traces: p.tr.includes(a.id), on: isOn(a),
      })),
    };
  });
  return { hasEx: ex.length > 0, chips, headers, rows, okCount, warnCount };
}

/** Screen-reader only labels (not shown in the prototype). */
export interface AlA11yLabels {
  /** Status column header. */
  status: string;
  /** Product column header. */
  product: string;
  /** Status of a product that contains an excluded allergen (dimmed row). */
  bad: string;
}
const A11Y: readonly [AlA11yLabels, AlA11yLabels] = [
  { status: 'Statut', product: 'Produit', bad: 'Ne convient pas' },
  { status: 'Status', product: 'Product', bad: 'Niet geschikt' },
];
export const alA11y = (lang: Lang): AlA11yLabels => A11Y[lang];
