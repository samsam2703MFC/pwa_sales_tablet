import { BOOK } from '../data/book';
import type { Allergen, Category, Lang, Product, Season, T2 } from '../data/types';
import { fmtPrice } from './format';
import { asset } from './asset';

const index = <X extends { id: string }>(xs: X[]): Record<string, X> => Object.fromEntries(xs.map(x => [x.id, x]));

/** Lookups by id. */
export const ALLERGENS: Record<string, Allergen> = index(BOOK.allergens);
export const SEASONS: Record<string, Season> = index(BOOK.seasons);
export const CATEGORIES: Record<string, Category> = index(BOOK.categories);
export const PRODUCTS: Record<string, Product> = index(BOOK.products);

/** Pick the text for the current language. */
export const tr = (a: T2 | null | undefined, lang: Lang): string => (a ? a[lang] : '');

/** Product view model shared by cards, pills and lists (the prototype's `card()`). */
export interface ProductCardVM {
  id: string;
  name: string;
  /** Resolved image URL. */
  img: string;
  /** Formatted price, '' if hidden/unknown. */
  price: string;
  unit: string;
  /** Allergen 3-letter codes. */
  als: string[];
  best: boolean;
  seasonal: boolean;
  seasonName: string;
  vegan: boolean;
  vege: boolean;
}

export const toCard = (x: Product, lang: Lang): ProductCardVM => ({
  id: x.id,
  name: tr(x.name, lang),
  img: asset(x.img),
  price: fmtPrice(x.price),
  unit: tr(x.unit, lang),
  als: x.al.map(a => ALLERGENS[a].s),
  best: !!x.best,
  seasonal: !!x.season,
  seasonName: x.season ? tr(SEASONS[x.season].n, lang) : '',
  vegan: x.diet === 'vegan',
  vege: x.diet === 'vege',
});

export const cardById = (id: string, lang: Lang): ProductCardVM | null => (PRODUCTS[id] ? toCard(PRODUCTS[id], lang) : null);
