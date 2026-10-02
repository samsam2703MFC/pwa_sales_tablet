import type { Lang } from '../../data/types';
import { seasonsNow, toSeasonVM, type SeasonVM } from '../../lib/seasons';

/** Everything the home view shows from the book, for a language and a month (1–12). */
export interface HomeModel {
  /** The current range: the season(s) of the month. */
  now: SeasonVM[];
}

export const homeModel = (lang: Lang, month: number): HomeModel => ({
  now: seasonsNow(month).map(x => toSeasonVM(x, lang)),
});
