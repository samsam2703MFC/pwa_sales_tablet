import { BOOK } from '../data/book';
import type { Lang, Product, Season } from '../data/types';
import { asset } from './asset';
import { CATALOG, toCard, tr, type Catalog, type ProductCardVM } from './catalog';

/** Seasons running during `month` (1–12), in data order. */
export const seasonsNow = (month: number, seasons: readonly Season[] = BOOK.seasons): Season[] =>
  seasons.filter(x => x.m.includes(month));

/**
 * The season to get ready for: the first one starting after `month` that is not
 * already running, else the first season of the year (wraps December → January);
 * null when there is no season at all.
 */
export const nextSeason = (month: number, seasons: readonly Season[] = BOOK.seasons): Season | null =>
  seasons.find(x => x.m[0] > month && !x.m.includes(month)) || seasons[0] || null;

/** Season block view model (the prototype's `sc()`), shared by the home page and Saisons. */
export interface SeasonVM {
  id: string;
  name: string;
  /** Resolved illustration URL. */
  img: string;
  dates: string;
  tip: string;
  /** Products of that season, in data order. */
  products: ProductCardVM[];
}

export const toSeasonVM = (
  x: Season,
  lang: Lang,
  products: readonly Product[] = BOOK.products,
  lk: Pick<Catalog, 'allergens' | 'seasons'> = CATALOG,
): SeasonVM => ({
  id: x.id,
  name: tr(x.n, lang),
  img: asset(x.img),
  dates: tr(x.dates, lang),
  tip: tr(x.tip, lang),
  products: products.filter(p => p.season === x.id).map(p => toCard(p, lang, lk)),
});
