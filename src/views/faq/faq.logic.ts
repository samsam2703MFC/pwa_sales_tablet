import { BOOK } from '../../data/book';
import type { Category, FaqItem, Lang } from '../../data/types';
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

/**
 * The prototype's `faqItems`: questions of the picked category (all for 'all'),
 * in data order, keeping their BOOK.faq index; only `faqOpen` is open.
 */
export const faqItems = (
  cat: string,
  faqOpen: number,
  lang: Lang,
  faq: readonly FaqItem[] = BOOK.faq,
  lk: Catalog = CATALOG,
): FaqItemVM[] =>
  faq
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => inFaqCat(f, cat))
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
