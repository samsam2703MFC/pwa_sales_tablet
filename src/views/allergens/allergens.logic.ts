import { BOOK } from '../../data/book';
import type { Allergen, Lang, Product } from '../../data/types';
import { allergensUnknown, tr } from '../../lib/catalog';

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
  /** Unverified allergen list and neither "contains" nor "traces": "?" (never shown as absent). */
  unknown: boolean;
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
  /**
   * "À vérifier" pill: the product's allergen list is unverified (BO data) and it is not known to
   * contain an excluded allergen — with or without a selection. Never OK.
   */
  unknown: boolean;
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
  /** Products marked "À vérifier" (0 with the sample data). */
  unknownCount: number;
}

export type AlStatus = Pick<AlRowVM, 'bad' | 'warn' | 'ok' | 'unknown'>;

/**
 * Compatibility of a product with the excluded allergens: the prototype's rules for verified
 * data (the sample), made safe for unverified BO data. A product whose allergen list is not
 * verified (`alKnown === false`) is never OK: "à vérifier", unless it is known to contain an
 * excluded allergen (bad). One whose traces were never entered (`trKnown === false`) is at
 * most "traces".
 */
export function allergenStatus(p: Pick<Product, 'al' | 'tr' | 'alKnown' | 'trKnown'>, ex: readonly string[]): AlStatus {
  const bad = ex.some(e => p.al.includes(e));
  const unknown = !bad && allergensUnknown(p);
  const warn = !bad && !unknown && ex.length > 0 && (p.trKnown === false || ex.some(e => p.tr.includes(e)));
  const ok = ex.length > 0 && !bad && !warn && !unknown;
  return { bad, warn, ok, unknown };
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
  let unknownCount = 0;
  const rows = products.map(p => {
    const st = allergenStatus(p, ex);
    if (st.ok) okCount++;
    if (st.warn) warnCount++;
    if (st.unknown) unknownCount++;
    const unverified = allergensUnknown(p);
    return {
      id: p.id,
      name: tr(p.name, lang),
      ...st,
      cells: allergens.map(a => {
        const contains = p.al.includes(a.id), traces = p.tr.includes(a.id);
        return { id: a.id, contains, traces, unknown: unverified && !contains && !traces, on: isOn(a) };
      }),
    };
  });
  return { hasEx: ex.length > 0, chips, headers, rows, okCount, warnCount, unknownCount };
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
