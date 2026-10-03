/**
 * A book as the BO sends it (GET /api/cockpit/tablette/book, schema 1), shaped like the phase-1
 * data: real-looking names, French only, photos under uploads/, no allergen verified yet.
 * Shared by the unit tests and the e2e suite (e2e/bo.spec.ts).
 */
export const REMOTE_PAYLOAD = {
  schema: 1,
  version: '3f2a9c0d1e',
  genereLe: '2026-10-02T09:12:00+02:00',
  shop: { id: '4', nom: 'Ixelles' },
  ensemble: 'comptoir',
  book: {
    categories: [
      { id: 'g-viennoiserie', n: ['Viennoiserie', ''] },
      { id: 'g-pain', n: ['Pain', 'Brood'] },
      { id: 'g-patisserie', n: ['Pâtisserie', ''] },
    ],
    seasons: [
      { id: 's12', img: 'img/s/christmas-new-year-range.png', m: [12], n: ['Noël & Nouvel An', ''], dates: ['1er au 31 décembre', '1 t/m 31 december'], tip: ['', ''] },
      { id: 's10', img: '', m: [9, 10, 11], n: ['Automne', 'Herfst'], dates: ['septembre à novembre', 'september t/m november'], tip: ['', ''] },
    ],
    products: [
      {
        id: '1610006', cat: 'g-viennoiserie', img: 'uploads/tablette/1610006-640.jpg', price: 1.3, unit: ['pièce', 'stuk'], best: true,
        name: ['Croissant au beurre AOP', ''], desc: ['', ''], pitch: ['', ''], ingr: ['', ''],
        al: [], tr: [], alKnown: false, trKnown: false, alRaw: 'Contient : gluten, lait, œuf. Traces : fruits à coque.',
        diet: 'vege', keep: ['Température ambiante. Réchauffe 3 min à 180 °C.', ''], dlc: 1, cross: [], crossLine: ['', ''],
      },
      {
        id: '1610042', cat: 'g-viennoiserie', season: 's10', img: 'uploads/plano/panel/1610042.png', price: 1.6, unit: ['pièce', 'stuk'], best: true,
        name: ['Couque suisse aux raisins', ''], desc: ['', ''], pitch: ['', ''], ingr: ['', ''],
        al: [], tr: [], alKnown: false, trKnown: false, alRaw: '',
        diet: null, keep: ['', ''], dlc: 1, cross: ['1610006'], crossLine: ['', ''],
        // The network's combos (screen Croisements): B off the counter (drinks), B in the book (an unknown id
        // dropped), and a malformed one (no "avec": dropped, the product kept).
        combos: [
          { avec: ['Boissons chaudes', ''], quand: ['Matin (avant 11 h)', 'Ochtend (voor 11 u)'], nom: ['le petit-déj complet', ''], cible: 7.5, ids: [] },
          { avec: ['Croissants', ''], quand: ['', ''], nom: ['', ''], cible: null, ids: ['1610006', 'ghost'] },
          { quand: ['', ''], ids: [] },
        ],
      },
      {
        id: '2200310', cat: 'g-pain', img: '', price: 3.4, unit: ['', ''], best: false,
        name: ['Pain gris multicéréales', 'Grijs meergranenbrood'], desc: ['Pain au levain, graines de lin et de tournesol.', ''], pitch: ['', ''], ingr: ['', ''],
        al: [], tr: [], alKnown: false, trKnown: false, alRaw: 'gluten, sésame',
        diet: 'vegan', keep: ['', ''], dlc: 3, cross: [], crossLine: ['', ''],
      },
      {
        id: '3300120', cat: 'g-patisserie', season: 's12', img: 'uploads/tablette/3300120-640.jpg', price: null, unit: ['', ''], best: false,
        name: ['Bûche pâtissière praliné', ''], desc: ['', ''], pitch: ['', ''], ingr: ['', ''],
        al: [], tr: [], alKnown: false, trKnown: false, alRaw: '',
        diet: null, keep: ['Au frais (2–4 °C).', ''], dlc: 2, cross: [], crossLine: ['', ''],
      },
    ],
  },
  manque: { total: 4, photos: 1, nl: 3, allergenes: 4, descriptions: 3 },
  photosRestantes: 1,
  sources: { produits: 'catalogue', photos: 'panel', best: 'ventes 28 j', saisons: 'périodes' },
};
