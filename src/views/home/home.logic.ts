import { BOOK } from '../../data/book';
import { ONB_SHORT } from '../../data/onboardingShort';
import type { Lang, Product, T2 } from '../../data/types';
import { toCard, tr, type ProductCardVM } from '../../lib/catalog';
import { navLabel, type View } from '../../lib/i18n';
import { nextSeason, seasonsNow, toSeasonVM, type SeasonVM } from '../../lib/seasons';
import type { AppState } from '../../state/store';

/** "Les plus vendus": products flagged `best`, in data order. */
export const bestSellers = (lang: Lang, products: readonly Product[] = BOOK.products): ProductCardVM[] =>
  products.filter(p => p.best).map(p => toCard(p, lang));

/** "Le client demande…" tile: a question and the pre-filtered section it opens. */
export interface QuickAsk {
  /** Stable React key: the same in FR and NL, so a language switch updates the tile in place. */
  id: string;
  label: T2;
  view: View;
  extra?: Partial<AppState>;
}

/** The 6 quick questions, in prototype order, with the filters they pre-apply. */
export const QUICK_ASKS: readonly QuickAsk[] = [
  { id: 'gluten', label: ['Sans gluten ?', 'Glutenvrij?'], view: 'al', extra: { ex: ['gluten'] } },
  { id: 'lait', label: ['Sans lait ?', 'Zonder melk?'], view: 'al', extra: { ex: ['lait'] } },
  { id: 'noix', label: ['Sans fruits à coque ?', 'Zonder noten?'], view: 'al', extra: { ex: ['noix', 'arach'] } },
  { id: 'vegan', label: ['Quelque chose de vegan ?', 'Iets veganistisch?'], view: 'gamme', extra: { vegan: true, cat: 'all' } },
  { id: 'gateau', label: ['Commander un gâteau', 'Een taart bestellen'], view: 'svc' },
  { id: 'lunch', label: ['Un lunch rapide', 'Een snelle lunch'], view: 'ventes' },
];

export interface QuickAskVM {
  id: string;
  label: string;
  /** Name of the target section (red sub-link). */
  sub: string;
  view: View;
  extra?: Partial<AppState>;
}

export const quickAsks = (lang: Lang): QuickAskVM[] =>
  QUICK_ASKS.map(q => ({ id: q.id, label: tr(q.label, lang), sub: navLabel(q.view, lang), view: q.view, extra: q.extra }));

/** Number of onboarding modules (opening + 6) — one short version per module of the livret. */
export const ONB_MODULES = ONB_SHORT.length;

/** Everything the home view shows, for a language and a month (1–12). */
export interface HomeModel {
  quick: QuickAskVM[];
  now: SeasonVM[];
  next: SeasonVM;
  best: ProductCardVM[];
}

export const homeModel = (lang: Lang, month: number): HomeModel => ({
  quick: quickAsks(lang),
  now: seasonsNow(month).map(x => toSeasonVM(x, lang)),
  next: toSeasonVM(nextSeason(month), lang),
  best: bestSellers(lang),
});
