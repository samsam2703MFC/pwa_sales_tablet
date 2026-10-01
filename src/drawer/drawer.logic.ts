import { BOOK } from '../data/book';
import type { Allergen, FaqItem, Lang, Product } from '../data/types';
import { CATEGORIES, PRODUCTS, SEASONS, toCard, tr, type ProductCardVM } from '../lib/catalog';
import { dlcLabel } from '../lib/format';
import { labels } from '../lib/i18n';

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
  grid: AllergenTileVM[];
  faq: SheetFaqVM[];
  /** Cross-sell products ("Proposez aussi"). */
  cross: ProductCardVM[];
}

/** "Toute l'année" / "Het hele jaar", or "Season name · dates" for a seasonal product. */
export const availability = (p: Product, lang: Lang): string => {
  const season = p.season ? SEASONS[p.season] : undefined;
  return season ? tr(season.n, lang) + ' · ' + tr(season.dates, lang) : labels(lang).allYear;
};

/** State of one allergen for a product: "contains" wins over "traces". */
export const allergenState = (p: Product, id: string): AllergenState =>
  p.al.includes(id) ? 'contains' : p.tr.includes(id) ? 'traces' : 'absent';

/** The 14 allergens, in data order, with the product's state for each. */
export const allergenGrid = (p: Product, lang: Lang, allergens: readonly Allergen[] = BOOK.allergens): AllergenTileVM[] =>
  allergens.map(a => ({ id: a.id, n: tr(a.n, lang), state: allergenState(p, a.id) }));

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
export const backName = (stack: readonly string[], lang: Lang): string => {
  const id = stack[stack.length - 1];
  return id && PRODUCTS[id] ? tr(PRODUCTS[id].name, lang) : '';
};

/** Builds the sheet of product `id`, or null when nothing (or an unknown id) is selected. */
export const sheetVM = (id: string | null, selFaq: number, lang: Lang): SheetVM | null => {
  const x = id ? PRODUCTS[id] : undefined;
  if (!x) return null;
  return {
    ...toCard(x, lang),
    cat: tr(CATEGORIES[x.cat]?.n, lang),
    desc: tr(x.desc, lang),
    pitch: tr(x.pitch, lang),
    ingr: tr(x.ingr, lang),
    keep: tr(x.keep, lang),
    dlc: dlcLabel(x.dlc, labels(lang)),
    crossLine: tr(x.crossLine, lang),
    avail: availability(x, lang),
    grid: allergenGrid(x, lang),
    faq: productFaq(x.id, selFaq, lang),
    cross: x.cross.filter(c => PRODUCTS[c]).map(c => toCard(PRODUCTS[c], lang)),
  };
};

/** Swipe-to-close on the sheet header: down > 70 px (portrait sheet) or right > 80 px (side panel). */
export const isCloseSwipe = (compact: boolean, dx: number, dy: number): boolean =>
  compact ? dy > 70 : dx > 80;
