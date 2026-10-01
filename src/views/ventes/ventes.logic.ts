import { BOOK } from '../../data/book';
import type { Combo, Lang, Product, T2 } from '../../data/types';
import { PRODUCTS, toCard, tr, type ProductCardVM } from '../../lib/catalog';
import { fmtPrice } from '../../lib/format';

/** Known products only (unknown ids are skipped instead of crashing). */
const known = (ids: readonly string[]): Product[] => ids.flatMap(id => (PRODUCTS[id] ? [PRODUCTS[id]] : []));

/** A "Formule" card: name, time slot, formatted price ('' when none) and its product tiles. */
export interface ComboVM {
  name: string;
  when: string;
  price: string;
  items: ProductCardVM[];
}

/** The prototype's `combos`. */
export const combos = (lang: Lang, data: readonly Combo[] = BOOK.combos, showPrices?: boolean): ComboVM[] =>
  data.map(c => ({
    name: tr(c.n, lang),
    when: tr(c.when, lang),
    price: fmtPrice(c.price, showPrices),
    items: known(c.items).map(p => toCard(p, lang)),
  }));

/** A "bon réflexe": its 1-based number and text. */
export interface ReflexVM {
  n: string;
  text: string;
}

/** The prototype's `reflexes`. */
export const reflexes = (lang: Lang, data: readonly T2[] = BOOK.reflexes): ReflexVM[] =>
  data.map((r, i) => ({ n: String(i + 1), text: tr(r, lang) }));

/** One row of "Associations par produit". */
export interface PairVM {
  id: string;
  name: string;
  /** Cross-sell product names joined by " · ". */
  cross: string;
  /** Sentence to say (without the « » quotes). */
  line: string;
}

/** The prototype's `pairs`: every product, in data order. */
export const pairs = (lang: Lang, products: readonly Product[] = BOOK.products): PairVM[] =>
  products.map(x => ({
    id: x.id,
    name: tr(x.name, lang),
    cross: known(x.cross).map(p => tr(p.name, lang)).join(' · '),
    line: tr(x.crossLine, lang),
  }));
