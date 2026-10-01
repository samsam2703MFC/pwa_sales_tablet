import { BOOK } from '../../data/book';
import type { Category, Lang, Product } from '../../data/types';
import { tr } from '../../lib/catalog';
import { dlcLabel } from '../../lib/format';
import { labels } from '../../lib/i18n';

/** One product row: name, shelf-life label ("Immédiat", "Jour même", "N jours") and storage advice. */
export interface ConsRowVM {
  id: string;
  name: string;
  dlc: string;
  keep: string;
}

export interface ConsGroupVM {
  id: string;
  name: string;
  rows: ConsRowVM[];
}

/** The prototype's `consGroups`: every category (data order) with its products (data order). */
export const consGroups = (
  lang: Lang,
  categories: readonly Category[] = BOOK.categories,
  products: readonly Product[] = BOOK.products,
): ConsGroupVM[] => {
  const L = labels(lang);
  return categories.map(c => ({
    id: c.id,
    name: tr(c.n, lang),
    rows: products
      .filter(p => p.cat === c.id)
      .map(x => ({ id: x.id, name: tr(x.name, lang), dlc: dlcLabel(x.dlc, L), keep: tr(x.keep, lang) })),
  }));
};
