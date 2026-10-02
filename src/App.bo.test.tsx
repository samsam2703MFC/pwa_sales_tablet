import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { REMOTE_PAYLOAD } from './test/remoteFixture';

/**
 * The whole app on a BO book, booted like src/main.tsx: setBook BEFORE the app modules are
 * first evaluated (src/lib/catalog.ts builds its lookups then). Checks that every screen reads
 * the BO book, that unverified allergens never read as "free of", and that empty blocks are
 * left out.
 */
let App: typeof import('./App').default;

beforeAll(async () => {
  vi.resetModules();
  const { SAMPLE_BOOK, setBook } = await import('./data/book');
  const { mergeBook, parsePayload } = await import('./data/remote');
  const payload = parsePayload(REMOTE_PAYLOAD)!;
  setBook(mergeBook(SAMPLE_BOOK, payload.book, 'http://bo.test/consulant_bo/'), {
    kind: 'bo', version: payload.version, generatedAt: payload.generatedAt, shop: payload.shop,
  });
  App = (await import('./App')).default;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterAll(cleanup);

const nav = () => screen.getByRole('navigation');
const go = (label: string) => fireEvent.click(within(nav()).getByRole('button', { name: label }));
const main = () => screen.getByRole('main');

describe('app on a BO book', () => {
  it('home: BO best sellers, BO source in the sidebar', () => {
    render(<App />);
    expect(screen.getByText(/^BO · Ixelles · /)).toBeTruthy();
    expect(screen.queryByText(/Données d'exemple/)).toBeNull();
    const best = screen.getByRole('heading', { name: 'Les plus vendus' }).parentElement!;
    expect(within(best).getAllByRole('button').map(b => b.textContent)).toEqual(['Croissant au beurre AOP1,30 €', 'Couque suisse aux raisins1,60 €']);
    const photos = within(best).getAllByRole('button').map(b => b.querySelector('img')!.getAttribute('src'));
    expect(photos).toEqual(['http://bo.test/consulant_bo/uploads/tablette/1610006-640.jpg', 'http://bo.test/consulant_bo/uploads/plano/panel/1610042.png']);
  });

  it('range: BO categories and products, placeholder picture, "à vérifier" instead of allergen codes', () => {
    go('La gamme');
    for (const c of ['Viennoiserie', 'Pain', 'Pâtisserie']) expect(within(main()).getByRole('heading', { name: c })).toBeTruthy();
    const card = within(main()).getByRole('button', { name: /Pain gris multicéréales/ });
    expect(card.querySelector('img')!.getAttribute('src')).toBe('/img/placeholder.svg');
    expect(within(card).getByText("À vérifier sur l'étiquette")).toBeTruthy();
    expect(within(main()).getAllByText("À vérifier sur l'étiquette")).toHaveLength(4);
  });

  it('product sheet: allergens to check on the label with the BO text, no empty block', () => {
    fireEvent.click(within(main()).getByRole('button', { name: /Croissant au beurre AOP/ }));
    const d = screen.getByRole('dialog', { name: 'Croissant au beurre AOP' });
    expect(within(d).getByText("À vérifier sur l'étiquette")).toBeTruthy();
    expect(within(d).getByText('Mention de la fiche : Contient : gluten, lait, œuf. Traces : fruits à coque.')).toBeTruthy();
    // no tile claims the product is free of an allergen
    expect(within(d).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(d).queryByText('Contient')).toBeNull();
    // pitch, description, ingredients and cross-sell are empty: left out
    expect(within(d).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Allergènes', 'Durée', 'Conservation']);
    fireEvent.click(within(d).getByRole('button', { name: 'Fermer' }));
  });

  it('allergens: never OK, "à vérifier" for every unverified product', () => {
    go('Allergènes');
    const rows = within(main()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(within(r).getByText('À vérifier')).toBeTruthy();
      expect(within(r).getAllByRole('img', { name: "À vérifier sur l'étiquette" })).toHaveLength(14);
    }
    fireEvent.click(within(main()).getByRole('button', { name: 'Gluten' }));
    expect(within(main()).queryByText('OK')).toBeNull();
    expect(screen.getByText("0 produits compatibles, 0 avec traces possibles, 4 à vérifier sur l'étiquette")).toBeTruthy();
  });

  it('Vendre plus: only the sections with content (no combo; only the product that has a cross-sell)', () => {
    go('Vendre plus');
    expect(within(main()).getAllByRole('heading').map(h => h.textContent)).toEqual(['Vendre plus', 'Les bons réflexes', 'Associations par produit']);
    const pairs = within(main()).getByRole('heading', { name: 'Associations par produit' }).parentElement!;
    expect(within(pairs).getAllByRole('button').map(b => b.textContent)).toEqual(['Couque suisse aux raisins']);
    expect(within(pairs).getByText('Croissant au beurre AOP')).toBeTruthy();
    expect(within(pairs).queryByText(/«/)).toBeNull();
  });

  it('statistics: sample banner, no top list naming unknown products', () => {
    go('Statistiques');
    expect(within(main()).getByText("Données d'exemple")).toBeTruthy();
    expect(within(main()).queryByRole('group', { name: 'Les plus vendus' })).toBeNull();
  });

  it('Dutch: texts the BO has only in French fall back to French', () => {
    fireEvent.click(screen.getByRole('button', { name: 'NL' }));
    go('Assortiment');
    expect(within(main()).getByRole('heading', { name: 'Viennoiserie' })).toBeTruthy();
    expect(within(main()).getByRole('heading', { name: 'Brood' })).toBeTruthy();
    expect(within(main()).getByRole('button', { name: /Croissant au beurre AOP/ })).toBeTruthy();
    expect(within(main()).getAllByText('Te controleren op het etiket')).toHaveLength(4);
  });
});
