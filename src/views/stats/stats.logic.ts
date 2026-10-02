import { BOOK } from '../../data/book';
import type { Lang, Period, PeriodStats, Seller, Stats } from '../../data/types';
import { cardById, CATALOG, type Catalog, type ProductCardVM } from '../../lib/catalog';
import { eur, eur2 } from '../../lib/format';
import { dayNames, pair, statsLabels } from '../../lib/i18n';

/**
 * Statistiques view model — the prototype's "stats" block of renderVals
 * (kpis / dayBars / topList / rankRows / sellerChips / perChips), same maths.
 * `sel` = 'team' | seller id, `per` = 'day' | 'week' | 'month'.
 */

/**
 * The figures are the bundled sample (phase 1: the BO sends no statistics yet, even when the
 * products come from it): the screen says so with a "Données d'exemple" banner.
 */
export const STATS_ARE_SAMPLE = true;

/** The sellers the figures are computed on: the whole team, or the selected seller. */
export const selectedSellers = (sel: string, stats: Stats = BOOK.stats): Seller[] =>
  sel === 'team' ? stats.sellers : stats.sellers.filter(x => x.id === sel);

/**
 * a / b, or 0 when there is nothing to divide by (a seller or a team with 0 tickets,
 * a week without sales, an empty selection): never NaN on screen.
 */
const ratio = (a: number, b: number): number => (b > 0 ? a / b : 0);

/**
 * Sum of the sellers' figures for the period. Cross-sell rate = average weighted
 * by tickets, rounded to the unit (0 when there is no ticket).
 */
export const aggregate = (list: readonly Seller[], per: Period): PeriodStats => {
  const tickets = list.reduce((a, x) => a + x[per].tickets, 0);
  return {
    ca: list.reduce((a, x) => a + x[per].ca, 0),
    tickets,
    cross: Math.round(ratio(list.reduce((a, x) => a + x[per].cross * x[per].tickets, 0), tickets)),
    saison: list.reduce((a, x) => a + x[per].saison, 0),
  };
};

/**
 * Progress bar width in % of the objective, clamped to 4–100 (always a visible stub).
 * A zero objective is always reached (`value >= 0`): full bar.
 */
export const progressPct = (value: number, objective: number): number =>
  objective > 0 ? Math.max(4, Math.min(100, Math.round((value / objective) * 100))) : 100;

/** One KPI card. */
export interface KpiVM {
  id: 'ca' | 'pan' | 'cross' | 'sais';
  label: string;
  value: string;
  /** Bottom line: objective ("Objectif 9,50 €"), or the ticket count for the revenue card. */
  sub: string;
  /** Progress bar width in % (null = no bar: revenue card). */
  pct: number | null;
  /** Objective reached / not yet (null = no status: revenue card). */
  hit: boolean | null;
}

/** 7-day revenue column. */
export interface DayBarVM {
  /** Short weekday name (Mon → Sun). */
  label: string;
  /** Formatted amount. */
  value: string;
  /** Bar height in % of the best day. */
  pct: number;
  /** Last day (today): Ruby Red, the others Abricot. */
  last: boolean;
}

/** "Les plus vendus" line. */
export interface TopItemVM {
  rank: number;
  product: ProductCardVM;
  qty: number;
  /** "212 pcs" / "212 st." */
  qtyLabel: string;
}

/** Team ranking row. */
export interface RankRowVM {
  id: string;
  rank: number;
  name: string;
  ca: string;
  pan: string;
  cross: string;
  /** Cross-sell rate reached the objective → red, else amber. */
  crossHit: boolean;
  saison: string;
  /** Row of the selected seller (highlighted). */
  on: boolean;
}

export interface OptionVM<T extends string = string> {
  id: T;
  label: string;
  active: boolean;
}

export interface StatsVM {
  periods: OptionVM<Period>[];
  sellers: OptionVM[];
  kpis: KpiVM[];
  days: DayBarVM[];
  top: TopItemVM[];
  rank: RankRowVM[];
}

/** KPI cards for the selection (objective of seasonal products × number of sellers). */
export const kpiCards = (lang: Lang, sel: string, per: Period, stats: Stats = BOOK.stats): KpiVM[] => {
  const LS = statsLabels(lang);
  const cur = selectedSellers(sel, stats);
  const g = aggregate(cur, per);
  const { obj } = stats;
  const objSaison = obj.saison[per] * cur.length;
  const pan = ratio(g.ca, g.tickets);
  return [
    { id: 'ca', label: LS.ca, value: eur(g.ca, lang), sub: g.tickets + ' ' + LS.tk.toLowerCase(), pct: null, hit: null },
    { id: 'pan', label: LS.pan, value: eur2(pan), sub: LS.obj + ' ' + eur2(obj.panier), pct: progressPct(pan, obj.panier), hit: pan >= obj.panier },
    { id: 'cross', label: LS.cross, value: g.cross + ' %', sub: LS.obj + ' ' + obj.cross + ' %', pct: progressPct(g.cross, obj.cross), hit: g.cross >= obj.cross },
    {
      id: 'sais', label: LS.sais, value: g.saison + ' ' + LS.units, sub: LS.obj + ' ' + objSaison + ' ' + LS.units,
      pct: progressPct(g.saison, objSaison), hit: g.saison >= objSaison,
    },
  ];
};

/** Revenue of the last 7 days (Mon → Sun) summed over the selection; heights relative to the best day (0 when no sales). */
export const dayBars = (lang: Lang, sel: string, stats: Stats = BOOK.stats): DayBarVM[] => {
  const cur = selectedSellers(sel, stats);
  const values = [0, 1, 2, 3, 4, 5, 6].map(i => cur.reduce((a, x) => a + x.bars[i], 0));
  const max = Math.max(...values);
  const names = dayNames(lang);
  return values.map((v, i) => ({ label: names[i], value: eur(v, lang), pct: Math.round(ratio(v, max) * 100), last: i === 6 }));
};

/**
 * Quantities of the selected sellers' top lists merged by product (first-seen order),
 * sorted by quantity desc (stable: ties keep first-seen order).
 */
export const mergeTop = (list: readonly Seller[]): [string, number][] => {
  const m = new Map<string, number>();
  for (const x of list) for (const [id, n] of x.top) m.set(id, (m.get(id) ?? 0) + n);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** "Les plus vendus": top 5 of the merged lists (unknown product ids are skipped). */
export const topProducts = (lang: Lang, sel: string, stats: Stats = BOOK.stats, lk: Catalog = CATALOG): TopItemVM[] => {
  const units = statsLabels(lang).units;
  return mergeTop(selectedSellers(sel, stats))
    .flatMap(([id, qty]) => {
      const product = cardById(id, lang, lk);
      return product ? [{ product, qty }] : [];
    })
    .slice(0, 5)
    .map(({ product, qty }, i) => ({ rank: i + 1, product, qty, qtyLabel: qty + ' ' + units }));
};

/** Team ranking for the period, by revenue desc (always the whole team). */
export const ranking = (lang: Lang, sel: string, per: Period, stats: Stats = BOOK.stats): RankRowVM[] =>
  [...stats.sellers]
    .sort((a, b) => b[per].ca - a[per].ca)
    .map((x, i) => {
      const d = x[per];
      return {
        id: x.id, rank: i + 1, name: x.name, ca: eur(d.ca, lang), pan: eur2(ratio(d.ca, d.tickets)),
        cross: d.cross + ' %', crossHit: d.cross >= stats.obj.cross, saison: String(d.saison), on: sel === x.id,
      };
    });

/** Whole view model. */
export const statsView = (lang: Lang, sel: string, per: Period, stats: Stats = BOOK.stats, lk: Catalog = CATALOG): StatsVM => {
  const LS = statsLabels(lang);
  return {
    periods: LS.per.map(([id, label]) => ({ id, label, active: per === id })),
    sellers: [{ id: 'team', name: LS.team }, ...stats.sellers].map(x => ({ id: x.id, label: x.name, active: sel === x.id })),
    kpis: kpiCards(lang, sel, per, stats),
    days: dayBars(lang, sel, stats),
    top: topProducts(lang, sel, stats, lk),
    rank: ranking(lang, sel, per, stats),
  };
};

/** Accessible names not shown on screen (period group, seller chip group, rank column header). */
const STATS_A11Y = pair(
  { period: 'Période', rankCol: 'Rang', sellers: 'Vendeuses' },
  { period: 'Periode', rankCol: 'Positie', sellers: 'Verkoopsters' },
);
export const statsA11y = (lang: Lang) => STATS_A11Y[lang];
