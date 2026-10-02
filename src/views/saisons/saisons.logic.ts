import { BOOK } from '../../data/book';
import type { Lang, Product, Season } from '../../data/types';
import { tr } from '../../lib/catalog';
import { monthNames } from '../../lib/i18n';
import { toSeasonVM, type SeasonVM } from '../../lib/seasons';

/** Calendar column header: short month name, highlighted for the current month. */
export interface MonthHeaderVM {
  label: string;
  /** 1–12. */
  month: number;
  current: boolean;
}

export const monthHeaders = (lang: Lang, month: number): MonthHeaderVM[] =>
  monthNames(lang).map((label, i) => ({ label, month: i + 1, current: i + 1 === month }));

/** One month cell of a season row. */
export interface CalCellVM {
  /** The season runs during this month (red bar). */
  on: boolean;
  /** Current-month column (tinted background). */
  current: boolean;
}

/** One calendar row per season, in data order. */
export interface CalRowVM {
  id: string;
  name: string;
  cells: CalCellVM[];
}

export const calendarRows = (lang: Lang, month: number, seasons: readonly Season[] = BOOK.seasons): CalRowVM[] =>
  seasons.map(x => ({
    id: x.id,
    name: tr(x.n, lang),
    cells: Array.from({ length: 12 }, (_, i) => ({ on: x.m.includes(i + 1), current: i + 1 === month })),
  }));

/** Season card (the prototype's `sc()`): illustration, dates, instruction and products. */
export interface SeasonCardVM extends SeasonVM {
  /** Running during the current month → "En ce moment" badge. */
  isNow: boolean;
}

export const seasonCards = (
  lang: Lang,
  month: number,
  seasons: readonly Season[] = BOOK.seasons,
  products: readonly Product[] = BOOK.products,
): SeasonCardVM[] => seasons.map(x => ({ ...toSeasonVM(x, lang, products), isNow: x.m.includes(month) }));

/** The cards the Saisons page shows: only the seasons running this month, in data order. */
export const currentSeasonCards = (
  lang: Lang,
  month: number,
  seasons: readonly Season[] = BOOK.seasons,
  products: readonly Product[] = BOOK.products,
): SeasonCardVM[] => seasonCards(lang, month, seasons, products).filter(c => c.isNow);
