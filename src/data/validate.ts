import type { BookData } from './types';

/**
 * Checks the links between the records of the book (ids typed by hand when the sample data
 * is replaced by the official product sheets). Returns one French message per problem, [] when
 * the book is consistent.
 *
 * At runtime an unknown id is skipped (the screen does not crash), which hides the mistake:
 * an unknown trace id would show a product as compatible in the allergen matrix, an unknown
 * category takes the product out of La gamme. The unit tests run this on the book, so CI fails
 * on such a typo; in development it is also logged to the console (src/main.tsx).
 */
export function validateBook(b: BookData): string[] {
  const errors: string[] = [];
  const ids = <X extends { id: string }>(xs: readonly X[]) => new Set(xs.map(x => x.id));
  const allergens = ids(b.allergens);
  const categories = ids(b.categories);
  const products = ids(b.products);
  const seasons = ids(b.seasons);
  const faqCats = ids(b.faqCats);

  const unique = (what: string, xs: readonly { id: string }[]) => {
    const seen = new Set<string>();
    for (const { id } of xs) {
      if (seen.has(id)) errors.push(`${what} : id en double « ${id} »`);
      seen.add(id);
    }
  };
  unique('allergens', b.allergens);
  unique('categories', b.categories);
  unique('products', b.products);
  unique('seasons', b.seasons);
  unique('faqCats', b.faqCats);
  unique('faqSubs', b.faqSubs);
  unique('services', b.services);
  unique('stats.sellers', b.stats.sellers);

  // Ids the filter chips use for "every category" (Tout) and "the whole team" (Équipe).
  if (categories.has('all')) errors.push('categories : « all » est réservé (chip « Tout »)');
  if (faqCats.has('all')) errors.push('faqCats : « all » est réservé (chip « Tout »)');
  if (b.faqSubs.some(x => x.id === 'all')) errors.push('faqSubs : « all » est réservé (chip « Tout »)');
  if (b.stats.sellers.some(s => s.id === 'team')) errors.push('stats.sellers : « team » est réservé (chip « Équipe »)');

  const known = (where: string, set: Set<string>, list: readonly string[] | undefined) => {
    for (const id of list ?? []) if (!set.has(id)) errors.push(`${where} : id inconnu « ${id} »`);
  };

  for (const p of b.products) {
    known(`${p.id}.cat`, categories, [p.cat]);
    if (p.season !== undefined) known(`${p.id}.season`, seasons, [p.season]);
    known(`${p.id}.al`, allergens, p.al);
    known(`${p.id}.tr`, allergens, p.tr);
    known(`${p.id}.cross`, products, p.cross);
    p.combos?.forEach((c, i) => known(`${p.id}.combos[${i}].items`, products, c.items));
    for (const a of p.al) if (p.tr.includes(a)) errors.push(`${p.id} : « ${a} » est à la fois dans al et dans tr`);
  }
  for (const x of b.faqSubs) known(`faqSubs.${x.id}.cat`, faqCats, [x.cat]);
  b.faq.forEach((f, i) => {
    known(`faq[${i}].cat`, faqCats, [f.cat]);
    known(`faq[${i}].p`, products, f.p);
    if (f.sub !== undefined) {
      const x = b.faqSubs.find(x => x.id === f.sub);
      if (!x) errors.push(`faq[${i}].sub : id inconnu « ${f.sub} »`);
      else if (x.cat !== f.cat) errors.push(`faq[${i}].sub : « ${f.sub} » appartient à « ${x.cat} », pas à « ${f.cat} »`);
    }
  });
  b.combos.forEach((c, i) => known(`combos[${i}].items`, products, c.items));
  for (const s of b.seasons) {
    if (!s.m.length || s.m.some(m => !Number.isInteger(m) || m < 1 || m > 12)) {
      errors.push(`${s.id}.m : mois attendus de 1 à 12 (${JSON.stringify(s.m)})`);
    }
  }
  for (const s of b.stats.sellers) {
    if (s.bars.length !== 7) errors.push(`${s.id}.bars : 7 jours attendus (${s.bars.length})`);
    known(`${s.id}.top`, products, s.top.map(t => t[0]));
  }
  return errors;
}
