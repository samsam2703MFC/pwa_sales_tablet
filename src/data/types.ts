/** A bilingual text: [FR, NL]. */
export type T2 = readonly [string, string];

export type Lang = 0 | 1; // 0 = FR, 1 = NL

export interface Allergen {
  id: string;
  /** Full name. */
  n: T2;
  /** 3-letter code (GLU, LAI, ŒUF…). */
  s: string;
}

export interface Category {
  id: string;
  n: T2;
}

export type Diet = 'vegan' | 'vege' | null;

export interface Product {
  id: string;
  cat: string;
  season?: string;
  img: string;
  price: number | null;
  unit: T2;
  best?: boolean;
  name: T2;
  desc: T2;
  pitch: T2;
  ingr: T2;
  /** Allergen ids the product contains. */
  al: string[];
  /** Allergen ids the product may contain as traces. */
  tr: string[];
  /**
   * false: `al` is not a verified list (allergens not entered or not parsed in the BO): the
   * product is never shown as free of any allergen ("à vérifier sur l'étiquette").
   * Absent = true (sample data).
   */
  alKnown?: boolean;
  /** false: traces were never entered, so the product is never shown as trace-free. Absent = true. */
  trKnown?: boolean;
  /** The allergen text of the BO product sheet, as entered (shown when `alKnown` is false). */
  alRaw?: string;
  diet: Diet;
  keep: T2;
  /** Shelf life in days (0 = immediate). */
  dlc: number;
  /** Ids of cross-sell products. */
  cross: string[];
  crossLine: T2;
}

export interface Season {
  id: string;
  img: string;
  /** Months 1–12. */
  m: number[];
  n: T2;
  dates: T2;
  tip: T2;
}

export interface FaqItem {
  cat: string;
  /** Sub-category (id of a `faqSubs` entry of the same `cat`); absent = only under "Tout". */
  sub?: string;
  /** Linked product ids. */
  p?: string[];
  q: T2;
  a: T2;
}

/** A FAQ sub-category: belongs to the FAQ category `cat`. */
export interface FaqSub {
  id: string;
  cat: string;
  n: T2;
}

export interface Service {
  id: string;
  img: string;
  n: T2;
  how: T2;
  delay: T2;
  say: T2;
}

export interface Combo {
  n: T2;
  when: T2;
  items: string[];
  price: number | null;
}

export type Period = 'day' | 'week' | 'month';

export interface PeriodStats {
  ca: number;
  tickets: number;
  /** Cross-sell rate in %. */
  cross: number;
  /** Seasonal products sold. */
  saison: number;
}

export interface Seller extends Record<Period, PeriodStats> {
  id: string;
  name: string;
  /** Revenue for the last 7 days (Mon → Sun). */
  bars: number[];
  /** [productId, quantity]. */
  top: [string, number][];
}

export interface Stats {
  obj: { panier: number; cross: number; saison: Record<Period, number> };
  sellers: Seller[];
}

export interface BookData {
  allergens: Allergen[];
  categories: Category[];
  products: Product[];
  seasons: Season[];
  faq: FaqItem[];
  faqCats: Category[];
  /** Second row of chips under a FAQ category (e.g. the product families under "Produits"), in display order. */
  faqSubs: FaqSub[];
  services: Service[];
  combos: Combo[];
  reflexes: T2[];
  stats: Stats;
}

export interface OnbScript {
  ctx: T2;
  bad: T2 | null;
  good: T2;
}

export interface OnbShortModule {
  rule: T2;
  points: T2[];
  scripts: OnbScript[];
  exo: T2;
  gain: T2 | null;
}

/** Where the book on screen comes from (data-source indicator). */
export interface BookSource {
  /** 'bo': fresh from the back-office; 'cache': the BO book saved on the device (offline); 'sample': bundled sample data. */
  kind: 'bo' | 'cache' | 'sample';
  /** Content hash of the BO book (null for the sample). */
  version: string | null;
  /** When the BO built the book (ISO 8601), null for the sample. */
  generatedAt: string | null;
  /** The shop the book was built for (null: network-wide, or the sample). */
  shop: { id: string; name: string } | null;
}
