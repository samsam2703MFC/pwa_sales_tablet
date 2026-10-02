import { BOOK } from '../../data/book';
import type { Category, FaqItem, FaqSub, Lang } from '../../data/types';
import { cardsByIds, CATALOG, tr, type Catalog, type ProductCardVM } from '../../lib/catalog';
import { labels } from '../../lib/i18n';

/** FAQ filter chip: 'all' ("Tout" / "Alles") then every FAQ category, in data order. */
export interface FaqChipVM {
  id: string;
  label: string;
}

export const faqChips = (lang: Lang, cats: readonly Category[] = BOOK.faqCats): FaqChipVM[] => [
  { id: 'all', label: labels(lang).all },
  ...cats.map(c => ({ id: c.id, label: tr(c.n, lang) })),
];

/**
 * Second row of chips under the picked category (e.g. the product families under "Produits"):
 * "Tout" then its sub-categories that have at least one question, in data order. [] when the
 * category has none (and for "Tout"): no second row.
 */
export const faqSubChips = (
  cat: string,
  lang: Lang,
  subs: readonly FaqSub[] = BOOK.faqSubs,
  faq: readonly FaqItem[] = BOOK.faq,
): FaqChipVM[] => {
  const used = subs.filter(x => x.cat === cat && faq.some(f => f.cat === cat && f.sub === x.id));
  return used.length ? [{ id: 'all', label: labels(lang).all }, ...used.map(x => ({ id: x.id, label: tr(x.n, lang) }))] : [];
};

/** One accordion entry. `index` is the position in BOOK.faq (what `faqOpen` stores). */
export interface FaqItemVM {
  index: number;
  q: string;
  a: string;
  open: boolean;
  /** "−" when open, "+" when closed. */
  sign: string;
  /** The question has linked product ids (even if none resolves, as in the prototype). */
  hasProds: boolean;
  prods: ProductCardVM[];
}

/** Does the question belong to the picked chip? */
export const inFaqCat = (f: FaqItem, cat: string): boolean => cat === 'all' || f.cat === cat;

/** …and to the picked sub-category chip ('all', or ignored under the "Tout" category)? */
export const inFaqSub = (f: FaqItem, cat: string, sub: string): boolean => inFaqCat(f, cat) && (cat === 'all' || sub === 'all' || f.sub === sub);

/**
 * The prototype's `faqItems`: questions of the picked category (all for 'all') and
 * sub-category, in data order, keeping their BOOK.faq index; only `faqOpen` is open.
 */
export const faqItems = (
  cat: string,
  sub: string,
  faqOpen: number,
  lang: Lang,
  faq: readonly FaqItem[] = BOOK.faq,
  lk: Catalog = CATALOG,
): FaqItemVM[] =>
  faq
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => inFaqSub(f, cat, sub))
    .map(({ f, index }) => {
      const open = faqOpen === index;
      return {
        index,
        q: tr(f.q, lang),
        a: tr(f.a, lang),
        open,
        sign: open ? '−' : '+',
        hasProds: !!f.p?.length,
        prods: cardsByIds(f.p ?? [], lang, lk),
      };
    });
