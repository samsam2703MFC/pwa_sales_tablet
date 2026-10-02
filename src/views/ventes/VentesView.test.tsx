import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { VentesView } from './VentesView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderVentes = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, view: 'ventes', ...initial }}>
      <VentesView />
      <Probe />
    </AppProvider>,
  );

afterEach(cleanup);

describe('VentesView', () => {
  it('renders the title and the 3 sections (FR)', () => {
    renderVentes(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vendre plus');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Formules', 'Les bons réflexes', 'Associations par produit']);
    expect(screen.getByText('Formule matin')).toBeTruthy();
    expect(screen.getByText('3,90 €')).toBeTruthy();
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem').map(li => li.textContent?.slice(0, 1))).toEqual(['1', '2', '3', '4']);
    expect(screen.getByText("Café & latte · Jus d'orange pressé")).toBeTruthy();
    expect(screen.getByText('« Avec un café, vous avez le petit-déjeuner complet. »')).toBeTruthy();
  });

  it('renders in NL', () => {
    renderVentes(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Meer verkopen');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Formules', 'De juiste reflexen', 'Combinaties per product']);
    expect(screen.getByText('Ochtendformule')).toBeTruthy();
    expect(screen.getByText('Koffie & latte · Versgeperst sinaasappelsap')).toBeTruthy();
  });

  it('the arrow before each cross-sell list is visible but hidden from assistive technology', () => {
    const { container } = renderVentes(0);
    const cross = screen.getByText("Café & latte · Jus d'orange pressé");
    expect(cross.textContent).toBe("→ Café & latte · Jus d'orange pressé");
    const arrows = container.querySelectorAll('[aria-hidden="true"]');
    expect(arrows).toHaveLength(BOOK.products.length);
    for (const a of arrows) expect(a.textContent).toBe('→ ');
    expect(cross.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(cross.firstElementChild?.textContent).toBe('→ ');
  });

  it('a product tile carries its name as title and opens the product sheet', () => {
    renderVentes(0);
    const tiles = screen.getAllByTitle('Café & latte');
    expect(tiles).toHaveLength(2); // formule matin + pause goûter
    fireEvent.click(tiles[0]);
    expect(state().sel).toBe('cafe');
  });

  it('one association row per product; the name opens the product sheet', () => {
    renderVentes(0);
    for (const p of BOOK.products) expect(screen.getAllByText(p.name[0]).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Bûche de Noël praliné' }));
    expect(state().sel).toBe('buche');
  });
});
