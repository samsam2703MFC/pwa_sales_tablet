import { BOOK } from '../../data/book';
import type { Combo, Lang, Product, T2 } from '../../data/types';
import { cardsByIds, CATALOG, knownProducts, tr, type Catalog, type ProductCardVM } from '../../lib/catalog';
import { fmtPrice } from '../../lib/format';

/** A "Formule" card: name, time slot, formatted price ('' when none) and its product tiles. */
export interface ComboVM {
  /** Stable React key (data index): the same in FR and NL. */
  id: string;
  name: string;
  when: string;
  price: string;
  items: ProductCardVM[];
}

/** The prototype's `combos`. */
export const combos = (lang: Lang, data: readonly Combo[] = BOOK.combos, showPrices?: boolean, lk: Catalog = CATALOG): ComboVM[] =>
  data.map((c, i) => ({
    id: String(i),
    name: tr(c.n, lang),
    when: tr(c.when, lang),
    price: fmtPrice(c.price, showPrices),
    // A product listed twice ("2 croissants + café") gives two tiles.
    items: cardsByIds(c.items, lang, lk),
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

/**
 * The prototype's `pairs`: every product, in data order — except those with nothing to suggest
 * (no known cross-sell product and no sentence: BO products until they are filled in).
 */
export const pairs = (lang: Lang, products: readonly Product[] = BOOK.products, lk: Catalog = CATALOG): PairVM[] =>
  products
    .map(x => ({
      id: x.id,
      name: tr(x.name, lang),
      cross: knownProducts(x.cross, lk.products).map(p => tr(p.name, lang)).join(' · '),
      line: tr(x.crossLine, lang),
    }))
    .filter(r => r.cross || r.line);
