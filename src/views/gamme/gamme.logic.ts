import { BOOK } from '../../data/book';
import type { Category, Lang, Product } from '../../data/types';
import { toCard, tr, type ProductCardVM } from '../../lib/catalog';
import { labels } from '../../lib/i18n';

/** Category filter chip: 'all' ("Tout" / "Alles") then every category, in data order. */
export interface CatChipVM {
  id: string;
  label: string;
}

export const catChips = (lang: Lang, categories: readonly Category[] = BOOK.categories): CatChipVM[] => [
  { id: 'all', label: labels(lang).all },
  ...categories.map(c => ({ id: c.id, label: tr(c.n, lang) })),
];

/** One category block of the range: title, number of products shown and their cards. */
export interface RangeGroupVM {
  id: string;
  name: string;
  count: number;
  items: ProductCardVM[];
}

/** Does the product pass the VEGAN toggle? */
export const passesVegan = (p: Product, vegan: boolean): boolean => !vegan || p.diet === 'vegan';

/**
 * The prototype's `groups`: every category (or only `cat` when one is picked), with its
 * products filtered by the VEGAN toggle; categories left empty are hidden.
 */
export const rangeGroups = (
  cat: string,
  vegan: boolean,
  lang: Lang,
  categories: readonly Category[] = BOOK.categories,
  products: readonly Product[] = BOOK.products,
): RangeGroupVM[] =>
  categories
    .filter(c => cat === 'all' || cat === c.id)
    .map(c => {
      const items = products.filter(p => p.cat === c.id && passesVegan(p, vegan)).map(p => toCard(p, lang));
      return { id: c.id, name: tr(c.n, lang), count: items.length, items };
    })
    .filter(g => g.items.length > 0);
