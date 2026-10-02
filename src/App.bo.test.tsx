import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OBJECTIVES_PAYLOAD } from './test/objectivesFixture';
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
  // The home page asks the BO for the shop's targets.
  vi.stubGlobal('fetch', objectives);
  // "En ce moment" follows the device clock: 2 October (the BO's autumn season).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 12));
});
afterAll(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const objectives = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
  new Response(JSON.stringify(OBJECTIVES_PAYLOAD), { status: 200, headers: { 'content-type': 'application/json' } }));

const nav = () => screen.getByRole('navigation');
/** Opens a section: its tab, else its tile in the "Plus" sheet. */
const go = (label: string) => {
  const tab = within(nav()).queryByRole('button', { name: label });
  if (tab) return fireEvent.click(tab);
  fireEvent.click(within(nav()).getByRole('button', { name: /^(Plus|Meer)$/ }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }));
};
const main = () => screen.getByRole('main');

describe('app on a BO book', () => {
  it('home: BO source in the top bar, the BO season of the moment with its photos, the BO targets', async () => {
    render(<App />);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByText(/^BO · Ixelles · /)).toBeTruthy();
    expect(screen.queryByText(/Données d'exemple/)).toBeNull();
    // The BO's autumn season (no illustration: placeholder), with its product and the BO photo.
    const season = within(main()).getByRole('article', { name: 'Automne' });
    expect(season.querySelector('img')!.getAttribute('src')).toBe('/img/placeholder.svg');
    const pills = within(season).getAllByRole('button');
    expect(pills.map(b => b.textContent)).toEqual(['Couque suisse aux raisins1,60 €']);
    expect(pills[0].querySelector('img')!.getAttribute('src')).toBe('http://bo.test/consulant_bo/uploads/plano/panel/1610042.png');
    // Objectives: shown with a BO book, from GET <API>/tablette/objectifs.
    expect(within(main()).getByText('Objectifs')).toBeTruthy();
    expect(await within(main()).findByText(/^4\s311 € \/ 6\s000 €$/)).toBeTruthy();
    expect(String(objectives.mock.calls[0][0])).toMatch(/\/api\/cockpit\/tablette\/objectifs$/);
    expect(within(main()).getByText('2,05 / 2,00')).toBeTruthy(); // items per ticket this month
    expect(within(main()).getByRole('form', { name: "Remarque d'un client" })).toBeTruthy();
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
    expect(within(d).getByText('Détail : Contient : gluten, lait, œuf. Traces : fruits à coque.')).toBeTruthy();
    // no tile claims the product is free of an allergen
    expect(within(d).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(d).queryByText('Contient')).toBeNull();
    // pitch, description, ingredients and cross-sell are empty: left out
    expect(within(d).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Allergènes', 'Durée', 'Conservation']);
    const keep = within(d).getByText('Température ambiante. Réchauffe 3 min à 180 °C.');
    expect(keep.className).not.toContain('keepNone');
    fireEvent.click(within(d).getByRole('button', { name: 'Fermer' }));
  });

  it('product sheet: "Conservation" is always there, "Non renseignée" (muted) when the BO has no text', () => {
    fireEvent.click(within(main()).getByRole('button', { name: /Couque suisse aux raisins/ }));
    const d = screen.getByRole('dialog', { name: 'Couque suisse aux raisins' });
    expect(within(d).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Allergènes', 'Durée', 'Conservation', 'Proposez aussi']);
    const none = within(d).getByText('Non renseignée');
    expect(none.previousElementSibling?.textContent).toBe('Conservation');
    expect(none.className).toContain('keepNone');
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
    fireEvent.click(within(main()).getByRole('button', { name: /Couque suisse aux raisins/ }));
    const d = screen.getByRole('dialog', { name: 'Couque suisse aux raisins' });
    expect(within(d).getByText('Niet ingevuld').previousElementSibling?.textContent).toBe('Bewaring');
    fireEvent.click(within(d).getByRole('button', { name: 'Sluiten' }));
  });
});
