import { BOOK } from '../data/book';
import type { Allergen, BookData, Category, Lang, Product, Season, T2 } from '../data/types';
import { fmtPrice } from './format';
import { asset } from './asset';

/** Records by id. Partial: an id typed by hand in the data may point to nothing. */
export type Lookup<X> = Readonly<Partial<Record<string, X>>>;

const index = <X extends { id: string }>(xs: readonly X[]): Lookup<X> => Object.fromEntries(xs.map(x => [x.id, x]));

/** The id lookups of one book. */
export interface Catalog {
  allergens: Lookup<Allergen>;
  seasons: Lookup<Season>;
  categories: Lookup<Category>;
  products: Lookup<Product>;
}

const catalogs = new WeakMap<BookData, Catalog>();

/** The lookups of `book`, built once per book object (the app's book, or a test fixture). */
export const catalogOf = (book: BookData): Catalog => {
  let c = catalogs.get(book);
  if (!c) {
    c = { allergens: index(book.allergens), seasons: index(book.seasons), categories: index(book.categories), products: index(book.products) };
    catalogs.set(book, c);
  }
  return c;
};

/** Lookups by id in the app's book. */
export const CATALOG: Catalog = catalogOf(BOOK);
export const ALLERGENS = CATALOG.allergens;
export const SEASONS = CATALOG.seasons;
export const CATEGORIES = CATALOG.categories;
export const PRODUCTS = CATALOG.products;

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

/** Unknown allergen or season ids are skipped (src/data/validate.ts reports them). */
export const toCard = (x: Product, lang: Lang, lk: Pick<Catalog, 'allergens' | 'seasons'> = CATALOG): ProductCardVM => ({
  id: x.id,
  name: tr(x.name, lang),
  img: asset(x.img),
  price: fmtPrice(x.price),
  unit: tr(x.unit, lang),
  als: x.al.flatMap(a => lk.allergens[a]?.s ?? []),
  best: !!x.best,
  seasonal: !!x.season,
  seasonName: tr(x.season ? lk.seasons[x.season]?.n : null, lang),
  vegan: x.diet === 'vegan',
  vege: x.diet === 'vege',
});

/** Known products only, in order (unknown ids are skipped instead of crashing). */
export const knownProducts = (ids: readonly string[], products: Lookup<Product> = PRODUCTS): Product[] =>
  ids.flatMap(id => products[id] ?? []);

/** Cards of the known products, in order (a repeated id gives a repeated card). */
export const cardsByIds = (ids: readonly string[], lang: Lang, lk: Catalog = CATALOG): ProductCardVM[] =>
  knownProducts(ids, lk.products).map(p => toCard(p, lang, lk));

export const cardById = (id: string, lang: Lang, lk: Catalog = CATALOG): ProductCardVM | null => cardsByIds([id], lang, lk)[0] ?? null;
