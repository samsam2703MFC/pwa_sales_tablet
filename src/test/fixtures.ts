/**
 * Small, hand-made book for the logic tests: they check behaviour (filters, order, unknown
 * ids, languages…) against it, so they keep passing when book.ts is replaced by the official
 * product sheets. Only the "sample data (prototype golden values)" blocks pin the sample book.
 */
import type { BookData, PeriodStats, Product, Seller } from '../data/types';
import { catalogOf } from '../lib/catalog';

/** A product with neutral defaults (names "<id>-fr" / "<id>-nl"); override what the test is about. */
export const product = (id: string, over: Partial<Product> = {}): Product => ({
  id, cat: 'c1', img: `img/p/${id}.png`, price: null, unit: ['pièce', 'stuk'], name: [`${id}-fr`, `${id}-nl`],
  desc: ['', ''], pitch: ['', ''], ingr: ['', ''], al: [], tr: [], diet: null, keep: ['', ''], dlc: 0, cross: [], crossLine: ['', ''],
  ...over,
});

/** A seller with the same figures [ca, tickets, cross %, seasonal] for every period. */
export const seller = (id: string, d: [number, number, number, number], top: [string, number][] = [], bars = [1, 1, 1, 1, 1, 1, 1]): Seller => {
  const ps: PeriodStats = { ca: d[0], tickets: d[1], cross: d[2], saison: d[3] };
  return { id, name: id.toUpperCase(), day: ps, week: ps, month: ps, bars, top };
};

/**
 * 3 allergens, 2 categories, 5 products, 3 seasons, 3 FAQ entries in 2 categories (q1 has two
 * sub-categories, only qa used), 2 combos,
 * 2 sellers. "ghost" is an id that resolves to nothing (typo in hand-entered data).
 */
export const FIXTURE_BOOK: BookData = {
  allergens: [
    { id: 'a1', n: ['Alpha', 'Alfa'], s: 'AAA' },
    { id: 'a2', n: ['Bêta', 'Bèta'], s: 'BBB' },
    { id: 'a3', n: ['Gamma', 'Gamma'], s: 'CCC' },
  ],
  categories: [
    { id: 'c1', n: ['Catégorie un', 'Categorie een'] },
    { id: 'c2', n: ['Catégorie deux', 'Categorie twee'] },
  ],
  products: [
    // vegan best seller, cross-sells a product and an unknown id
    product('p1', {
      cat: 'c1', price: 2.5, best: true, diet: 'vegan', al: ['a1'], tr: ['a2'], dlc: 1,
      desc: ['Pain au levain', 'Zuurdesembrood'], cross: ['p2', 'ghost'], crossLine: ['Avec une tarte ?', 'Met een taart?'],
    }),
    // seasonal (spring), vegetarian, contains butter
    product('p2', { cat: 'c1', price: 4, season: 's1', diet: 'vege', al: ['a1', 'a2'], ingr: ['beurre, farine', 'boter, bloem'], cross: ['p1'], dlc: 3 }),
    // best seller without price, traces only
    product('p3', { cat: 'c2', best: true, tr: ['a3'], keep: ['Au frais', 'Koel'], dlc: 2 }),
    // seasonal (winter), repeats a cross-sell id
    product('p4', { cat: 'c2', season: 's2', al: ['a3'], cross: ['p1', 'p1'] }),
    // vegan, nothing else
    product('p5', { cat: 'c2', diet: 'vegan' }),
  ],
  seasons: [
    { id: 's1', img: 'img/s/s1.png', m: [3, 4], n: ['Printemps', 'Lente'], dates: ['mars – avril', 'maart – april'], tip: ['Mettre en avant', 'In de kijker'] },
    { id: 's2', img: 'img/s/s2.png', m: [11, 12], n: ['Hiver', 'Winter'], dates: ['novembre – décembre', 'november – december'], tip: ['Commandes', 'Bestellingen'] },
    { id: 's3', img: 'img/s/s3.png', m: [12], n: ['Fêtes', 'Feesten'], dates: ['décembre', 'december'], tip: ['Réserver', 'Reserveren'] },
  ],
  faq: [
    { cat: 'q1', sub: 'qa', p: ['p1', 'ghost'], q: ['Question un ?', 'Vraag een?'], a: ['Réponse un', 'Antwoord een'] },
    { cat: 'q2', q: ['Question deux ?', 'Vraag twee?'], a: ['Avec du beurre', 'Met boter'] },
    { cat: 'q1', p: ['p3', 'p1'], q: ['Question trois ?', 'Vraag drie?'], a: ['Réponse trois', 'Antwoord drie'] },
  ],
  faqCats: [
    { id: 'q1', n: ['Allergies', 'Allergieën'] },
    { id: 'q2', n: ['Commandes', 'Bestellingen'] },
  ],
  faqSubs: [
    { id: 'qa', cat: 'q1', n: ['Gluten', 'Gluten'] },
    { id: 'qb', cat: 'q1', n: ['Lait', 'Melk'] },
  ],
  services: [
    { id: 'sv', img: 'img/svc/sv.png', n: ['Service', 'Dienst'], how: ['Comment', 'Hoe'], delay: ['Délai', 'Termijn'], say: ['Dire', 'Zeggen'] },
  ],
  combos: [
    { n: ['Formule un', 'Formule een'], when: ['matin', 'ochtend'], items: ['p1', 'p1', 'ghost', 'p5'], price: 3.9 },
    { n: ['Formule deux', 'Formule twee'], when: ['soir', 'avond'], items: [], price: null },
  ],
  reflexes: [['Réflexe un', 'Reflex een'], ['Réflexe deux', 'Reflex twee']],
  stats: {
    obj: { panier: 10, cross: 30, saison: { day: 5, week: 20, month: 80 } },
    sellers: [
      seller('ana', [200, 20, 40, 6], [['p1', 5], ['p3', 7], ['ghost', 9]]),
      seller('bea', [100, 10, 10, 2], [['p1', 4], ['p2', 1]]),
    ],
  },
};

/** Lookups of FIXTURE_BOOK (pass as the optional `lk` of the logic functions). */
export const FIXTURE_CATALOG = catalogOf(FIXTURE_BOOK);
