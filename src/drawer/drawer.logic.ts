import { BOOK, BOOK_SOURCE } from '../data/book';
import type { Allergen, BookData, FaqItem, Lang, Product, ProductCombo, Season } from '../data/types';
import { allergensUnknown, cardsByIds, catalogOf, PRODUCTS, SEASONS, toCard, tr, type Catalog, type Lookup, type ProductCardVM } from '../lib/catalog';
import { config } from '../lib/config';
import { now } from '../lib/date';
import { dlcLabel } from '../lib/format';
import { labels, locale, saleLabels } from '../lib/i18n';
import { bundlesForProduct, type ProductBundleVM } from '../views/home/bundles.logic';

/** How a product relates to one of the 14 allergens. */
export type AllergenState = 'contains' | 'traces' | 'absent';

/** One tile of the sheet's allergen grid. */
export interface AllergenTileVM {
  id: string;
  /** Full allergen name in the current language. */
  n: string;
  state: AllergenState;
}

/** A FAQ question linked to the product. `index` is its position in BOOK.faq (what `selFaq` stores). */
export interface SheetFaqVM {
  index: number;
  q: string;
  a: string;
  open: boolean;
  /** "−" when open, "+" when closed. */
  sign: string;
}

/** Everything the product sheet shows (the prototype's `sel`). */
export interface SheetVM extends ProductCardVM {
  /** Category name (header eyebrow). */
  cat: string;
  desc: string;
  pitch: string;
  ingr: string;
  keep: string;
  /** Shelf-life label ("Jour même", "3 jours"…). */
  dlc: string;
  crossLine: string;
  /** Availability badge: "Toute l'année" or "Season · dates". */
  avail: string;
  /** false: the allergen list is unverified (BO data): "à vérifier" notice instead of the full grid. */
  alKnown: boolean;
  /** false: traces were never entered (note under the grid). */
  trKnown: boolean;
  /** Allergen text of the BO product sheet, shown with the "à vérifier" notice ('' when none). */
  alRaw: string;
  /** The 14 allergen tiles; only the "contains" / "traces" ones when the list is unverified. */
  grid: AllergenTileVM[];
  faq: SheetFaqVM[];
  /** Cross-sell products ("Proposez aussi"). */
  cross: ProductCardVM[];
  /** Sales arguments drawn from what the book knows: best seller, season, shelf life, diet. */
  args: string[];
  /** The network's combos (BO): what to offer with it, and B's products in the book. */
  combos: SheetComboVM[];
  /** Cross-sell products not already shown under a combo. */
  crossRest: ProductCardVM[];
  /** The bundles it is part of in this shop ("Dans les menus & bundles"). */
  bundles: ProductBundleVM[];
}

/** A network combo on the product sheet. */
export interface SheetComboVM {
  /** What to offer ("Boissons chaudes"). */
  with: string;
  /** When, nickname and target: "Matin (avant 11 h) · « le déjeuner complet » · objectif réseau : 25 % des tickets". */
  meta: string;
  items: ProductCardVM[];
}

/** Where and when the sheet is shown: the bundles depend on the day and the shop. */
export interface SheetContext {
  today: Date;
  shop: string | null;
}

const sheetContext = (): SheetContext => ({ today: now(), shop: BOOK_SOURCE.shop?.id ?? config.shop });

/** "Toute l'année" / "Het hele jaar", or "Season name · dates" for a seasonal product. */
export const availability = (p: Product, lang: Lang, seasons: Lookup<Season> = SEASONS): string => {
  const season = p.season ? seasons[p.season] : undefined;
  return season ? tr(season.n, lang) + ' · ' + tr(season.dates, lang) : labels(lang).allYear;
};

/** State of one allergen for a product: "contains" wins over "traces". */
export const allergenState = (p: Product, id: string): AllergenState =>
  p.al.includes(id) ? 'contains' : p.tr.includes(id) ? 'traces' : 'absent';

/**
 * The 14 allergens, in data order, with the product's state for each. When the product's list
 * is unverified, only what is known to be there: an "absent" tile would claim it is free of it.
 */
export const allergenGrid = (p: Product, lang: Lang, allergens: readonly Allergen[] = BOOK.allergens): AllergenTileVM[] =>
  allergens
    .map(a => ({ id: a.id, n: tr(a.n, lang), state: allergenState(p, a.id) }))
    .filter(t => t.state !== 'absent' || !allergensUnknown(p));

/**
 * FAQ questions whose linked products include `id`, in data order, keeping their BOOK.faq index;
 * only `selFaq` is open.
 */
export const productFaq = (id: string, selFaq: number, lang: Lang, faq: readonly FaqItem[] = BOOK.faq): SheetFaqVM[] =>
  faq
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => !!f.p?.includes(id))
    .map(({ f, index }) => {
      const open = selFaq === index;
      return { index, q: tr(f.q, lang), a: tr(f.a, lang), open, sign: open ? '−' : '+' };
    });

/** Name of the product the "←" button goes back to (top of the stack), '' when the stack is empty. */
export const backName = (stack: readonly string[], lang: Lang, products: Lookup<Product> = PRODUCTS): string => {
  const id = stack[stack.length - 1];
  return tr(id ? products[id]?.name : null, lang);
};

/** Sales arguments from the facts of the book, in this order: best seller, season, shelf life, diet. */
export function salesArgs(x: Product, lang: Lang, seasons: Lookup<Season> = SEASONS): string[] {
  const S = saleLabels(lang);
  const season = x.season ? seasons[x.season] : undefined;
  return [
    x.best ? S.best : '',
    season ? S.season(tr(season.n, lang), tr(season.dates, lang)) : '',
    x.dlc === 1 ? S.dlc1 : x.dlc >= 2 ? S.dlcN(x.dlc) : '',
    x.diet === 'vegan' ? S.vegan : x.diet === 'vege' ? S.vege : '',
  ].filter(Boolean);
}

/** A combo for the sheet: its products (unknown ids skipped), when, nickname and target in one line. */
export function comboVM(c: ProductCombo, lang: Lang, lk: Catalog): SheetComboVM {
  const S = saleLabels(lang);
  const nick = tr(c.name, lang);
  const target = c.target === null ? '' : S.target(c.target.toLocaleString(locale(lang), { maximumFractionDigits: 1 }));
  return {
    with: tr(c.with, lang),
    meta: [tr(c.when, lang), nick ? `« ${nick} »` : '', target].filter(Boolean).join(' · '),
    items: cardsByIds(c.items, lang, lk),
  };
}

/** Builds the sheet of product `id`, or null when nothing (or an unknown id) is selected. */
export const sheetVM = (
  id: string | null,
  selFaq: number,
  lang: Lang,
  book: BookData = BOOK,
  ctx: SheetContext = sheetContext(),
): SheetVM | null => {
  const lk = catalogOf(book);
  const x = id ? lk.products[id] : undefined;
  if (!x) return null;
  const combos = x.combos ?? [];
  const inCombo = new Set(combos.flatMap(c => c.items));
  return {
    ...toCard(x, lang, lk),
    cat: tr(lk.categories[x.cat]?.n, lang),
    desc: tr(x.desc, lang),
    pitch: tr(x.pitch, lang),
    ingr: tr(x.ingr, lang),
    keep: tr(x.keep, lang),
    dlc: dlcLabel(x.dlc, labels(lang)),
    crossLine: tr(x.crossLine, lang),
    avail: availability(x, lang, lk.seasons),
    alKnown: !allergensUnknown(x),
    trKnown: x.trKnown !== false,
    alRaw: x.alRaw?.trim() ?? '',
    grid: allergenGrid(x, lang, book.allergens),
    faq: productFaq(x.id, selFaq, lang, book.faq),
    // A repeated id gives a repeated pill, as in the prototype.
    cross: cardsByIds(x.cross, lang, lk),
    args: salesArgs(x, lang, lk.seasons),
    combos: combos.map(c => comboVM(c, lang, lk)),
    crossRest: cardsByIds(x.cross.filter(c => !inCombo.has(c)), lang, lk),
    bundles: bundlesForProduct({ name: x.name[0], cat: lk.categories[x.cat]?.n[0] ?? '', price: x.price }, ctx.today, ctx.shop, lang),
  };
};

/** Swipe-to-close on the sheet header: down > 70 px (portrait sheet) or right > 80 px (side panel), the swipe axis dominating (a diagonal scroll gesture does not close). */
export const isCloseSwipe = (compact: boolean, dx: number, dy: number): boolean =>
  compact ? dy > 70 && dy > Math.abs(dx) : dx > 80 && dx > Math.abs(dy);
