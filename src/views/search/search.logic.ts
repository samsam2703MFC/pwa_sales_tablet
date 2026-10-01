import { BOOK } from '../../data/book';
import type { BookData, FaqItem, Product, T2 } from '../../data/types';

/**
 * Global search (prototype `renderVals()` → qProducts / qFaq).
 *
 * Case-insensitive substring of the trimmed query, checked against EVERY language
 * of a field (a FR query finds NL text and vice versa, like the prototype's `hit()`).
 */

/** Normalised query: trimmed, lower-cased ('' = no search). */
export const normalizeQuery = (q: string): string => q.trim().toLowerCase();

/** True when one of the language variants contains the (normalised) query. */
export const hit = (t: T2 | null | undefined, q: string): boolean => !!t && t.some(v => v.toLowerCase().includes(q));

export interface SearchResults {
  /** Matching products, in book order. */
  products: Product[];
  /** Matching FAQ entries with their index in `book.faq`. */
  faq: { f: FaqItem; i: number }[];
}

/** Products: name, description, ingredients or the name of one of its allergens. FAQ: question or answer. */
export function search(rawQ: string, book: BookData = BOOK): SearchResults {
  const q = normalizeQuery(rawQ);
  if (!q) return { products: [], faq: [] };
  const allergens = Object.fromEntries(book.allergens.map(a => [a.id, a]));
  const products = book.products.filter(x =>
    hit(x.name, q) || hit(x.desc, q) || hit(x.ingr, q) || x.al.some(a => hit(allergens[a]?.n, q)));
  const faq = book.faq.map((f, i) => ({ f, i })).filter(({ f }) => hit(f.q, q) || hit(f.a, q));
  return { products, faq };
}
