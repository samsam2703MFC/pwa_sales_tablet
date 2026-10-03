import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Lang } from '../data/types';
import { PRODUCTS } from '../lib/catalog';
import { AppProvider, useApp, type AppState } from '../state/store';
import { ProductDrawer } from './ProductDrawer';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

/** A product card outside the sheet, to open it like the views do. */
function Opener({ id }: { id: string }) {
  const { actions } = useApp();
  return <button type="button" onClick={() => actions.openProduct(id)}>open {id}</button>;
}

const setWidth = (w: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });

const renderDrawer = (lang: Lang = 0, initial: Partial<AppState> = {}, width = 1280) => {
  setWidth(width);
  return render(
    <AppProvider initial={{ lang, ...initial }}>
      <Opener id="croissant" />
      <Opener id="painslait" />
      <ProductDrawer />
      <Probe />
    </AppProvider>,
  );
};

const dialog = () => screen.getByRole('dialog');
const btn = (name: string | RegExp) => within(dialog()).getByRole('button', { name });
/** The sticky header (first child of the dialog), where the swipe is detected. */
const header = () => dialog().firstElementChild as HTMLElement;

afterEach(cleanup);

describe('ProductDrawer', () => {
  it('renders nothing without a selected product', () => {
    renderDrawer();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows every section of the sheet (FR)', () => {
    renderDrawer(0, { sel: 'croissant' });
    const d = dialog();
    expect(d.getAttribute('aria-modal')).toBe('true');
    // ARIA in HTML forbids role="dialog" on <article> (the prototype's element)
    expect(d.tagName).toBe('DIV');
    expect(screen.getByRole('dialog', { name: 'Croissant pur beurre' })).toBe(d);
    expect(within(d).getByRole('heading', { level: 2 }).textContent).toBe('Croissant pur beurre');
    for (const t of ['Viennoiseries', '1,30 €', 'pièce', "Toute l'année", 'Végétarien', 'Top vente', 'Jour même', 'Fermer']) {
      expect(within(d).getByText(t)).toBeTruthy();
    }
    expect(within(d).getAllByRole('heading', { level: 3 }).map(h => h.textContent))
      .toEqual(['À dire au client', 'Allergènes', 'Ingrédients', 'Durée', 'Conservation', 'Proposez aussi']);
    expect(within(d).getByText('« Il sort du four ce matin, il est encore tout croustillant. »')).toBeTruthy();
    expect(within(d).getByText('« Avec un café, vous avez le petit-déjeuner complet. »')).toBeTruthy();
    // 14 allergen tiles, the state is also given in words
    const tiles = within(d).getAllByRole('listitem');
    expect(tiles).toHaveLength(14);
    expect(tiles[0].textContent).toBe('Gluten: Contient');
    expect(tiles[1].textContent).toBe('Crustacés');
    expect(tiles.find(t => t.textContent?.startsWith('Sésame'))!.textContent).toBe('Sésame: Traces possibles');
    expect(tiles.every(t => t.querySelector('svg[aria-hidden="true"]'))).toBe(true); // the allergen pictograms
    // no linked FAQ for the croissant, no back button
    expect(within(d).queryByText('Ce que les clients demandent')).toBeNull();
    expect(within(d).getAllByRole('button').map(b => b.textContent)).toEqual(['Fermer', 'Café & latte2,80 €', "Jus d'orange pressé3,90 €"]);
  });

  it('is translated (NL)', () => {
    renderDrawer(1, { sel: 'croissant' });
    const d = screen.getByRole('dialog', { name: 'Croissant met roomboter' });
    for (const t of ['Viennoiserie', 'stuk', 'Het hele jaar', 'Vegetarisch', 'Topper', 'Dezelfde dag', 'Sluiten', 'Tegen de klant', 'Allergenen', 'Stel ook voor']) {
      expect(within(d).getByText(t)).toBeTruthy();
    }
    expect(within(d).getAllByRole('listitem')[0].textContent).toBe('Gluten: Bevat');
  });

  it('"Fermer", the scrim and Escape close the sheet and clear the stack', () => {
    const { container } = renderDrawer(0, { sel: 'jus', stack: ['croissant'] });
    fireEvent.click(btn('Fermer'));
    expect(state()).toMatchObject({ sel: null, stack: [] });

    fireEvent.click(screen.getByRole('button', { name: 'open croissant' }));
    expect(dialog()).toBeTruthy();
    const scrim = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(scrim);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'open croissant' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(state()).toMatchObject({ sel: null, stack: [] });
  });

  it('a cross-sell pill opens that product and "← back" returns to the previous one', () => {
    renderDrawer(0, { sel: 'croissant' });
    fireEvent.click(btn(/^Jus d'orange pressé/));
    expect(state()).toMatchObject({ sel: 'jus', stack: ['croissant'] });
    const back = btn('Retour à Croissant pur beurre');
    expect(back.textContent).toBe('← Croissant pur beurre');
    expect(within(dialog()).getByText('Boissons')).toBeTruthy();
    fireEvent.click(back);
    expect(state()).toMatchObject({ sel: 'croissant', stack: [] });
    expect(within(dialog()).queryByRole('button', { name: /^Retour à/ })).toBeNull();
  });

  it('back button is translated (NL)', () => {
    renderDrawer(1, { sel: 'jus', stack: ['croissant'] });
    expect(btn('Terug naar Croissant met roomboter').textContent).toBe('← Croissant met roomboter');
  });

  it('linked FAQ: accordion with aria-expanded, one answer at a time', () => {
    renderDrawer(0, { sel: 'jus' });
    expect(within(dialog()).getByText('Ce que les clients demandent')).toBeTruthy();
    const q0 = btn('Avez-vous des produits sans gluten ?');
    const q2 = btn('Quels produits sont vegan ?');
    const panel = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-controls')!)!;
    expect([q0, q2].map(b => b.getAttribute('aria-expanded'))).toEqual(['false', 'false']);
    expect(panel(q0).hidden).toBe(true);
    expect(q0.textContent).toBe('Avez-vous des produits sans gluten ?+');

    fireEvent.click(q2);
    expect(state().selFaq).toBe(2);
    expect([q0, q2].map(b => b.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
    expect(panel(q2).hidden).toBe(false);
    expect(q2.textContent).toBe('Quels produits sont vegan ?−');

    fireEvent.click(q0);
    expect(state().selFaq).toBe(0);
    expect([q0, q2].map(b => b.getAttribute('aria-expanded'))).toEqual(['true', 'false']);

    fireEvent.click(q0);
    expect(state().selFaq).toBe(-1);
  });

  it('opening another product closes the open FAQ answer', () => {
    renderDrawer(0, { sel: 'jus', selFaq: 0 });
    fireEvent.click(btn(/^Pistolet/));
    expect(state()).toMatchObject({ sel: 'pistolet', selFaq: -1, stack: ['jus'] });
  });

  it('moves focus into the dialog, keeps it there, and gives it back to the trigger on close', () => {
    renderDrawer(0);
    const trigger = screen.getByRole('button', { name: 'open croissant' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(dialog());

    // Tab from the last button wraps to the first one, Shift+Tab from the first goes to the last
    const buttons = within(dialog()).getAllByRole('button');
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });

  it('locks the page scroll while open', () => {
    renderDrawer(0);
    expect(document.documentElement.style.overflow).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'open croissant' }));
    expect(document.documentElement.style.overflow).toBe('hidden');
    fireEvent.click(btn('Fermer'));
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('starts at the top for every product shown', () => {
    renderDrawer(0, { sel: 'croissant' });
    // jsdom does not scroll: track the panel's scrollTop by hand
    let top = 300;
    Object.defineProperty(dialog(), 'scrollTop', { configurable: true, get: () => top, set: (v: number) => { top = v; } });
    fireEvent.click(btn(/^Café & latte/));
    expect(state().sel).toBe('cafe');
    expect(top).toBe(0);
    top = 500;
    fireEvent.click(btn('Retour à Croissant pur beurre'));
    expect(top).toBe(0);
  });

  it('side panel: a swipe right over 80 px on the header closes it', () => {
    renderDrawer(0, { sel: 'croissant' }, 1280);
    fireEvent.touchStart(header(), { touches: [{ clientX: 700, clientY: 30 }] });
    fireEvent.touchEnd(header(), { changedTouches: [{ clientX: 760, clientY: 30 }] });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    fireEvent.touchStart(header(), { touches: [{ clientX: 700, clientY: 30 }] });
    fireEvent.touchEnd(header(), { changedTouches: [{ clientX: 700, clientY: 200 }] });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    // Diagonal scroll on the sticky header (mostly vertical, some rightward drift): stays open.
    fireEvent.touchStart(header(), { touches: [{ clientX: 700, clientY: 30 }] });
    fireEvent.touchEnd(header(), { changedTouches: [{ clientX: 790, clientY: 280 }] });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    fireEvent.touchStart(header(), { touches: [{ clientX: 700, clientY: 30 }] });
    fireEvent.touchEnd(header(), { changedTouches: [{ clientX: 790, clientY: 30 }] });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('bottom sheet (portrait): handle, and a swipe down over 70 px on the header closes it', () => {
    renderDrawer(0, { sel: 'croissant', stack: ['jus'] }, 820);
    expect(header().children).toHaveLength(2); // handle row + button row
    fireEvent.touchStart(header(), { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(header(), { changedTouches: [{ clientX: 400, clientY: 110 }] });
    expect(screen.queryByRole('dialog')).not.toBeNull();
    fireEvent.touchStart(header(), { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(header(), { changedTouches: [{ clientX: 200, clientY: 180 }] });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(state()).toMatchObject({ sel: null, stack: [] });
  });

  it('a repeated cross-sell id (data typo) shows a repeated pill and leaves no stale pill on product switch', () => {
    const croissant = PRODUCTS.croissant!, painslait = PRODUCTS.painslait!;
    const saved = [croissant.cross, painslait.cross];
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      croissant.cross = ['cafe', 'jus', 'cafe'];
      painslait.cross = ['jus', 'cafe'];
      renderDrawer(0, { sel: 'croissant' });
      const pills = () => within(dialog()).getAllByRole('button').map(b => b.textContent).filter(t => t?.includes('€'));
      expect(pills()).toEqual(['Café & latte2,80 €', "Jus d'orange pressé3,90 €", 'Café & latte2,80 €']);
      fireEvent.click(screen.getByRole('button', { name: 'open painslait' }));
      expect(state().sel).toBe('painslait');
      expect(pills()).toEqual(["Jus d'orange pressé3,90 €", 'Café & latte2,80 €']);
      expect(error.mock.calls.filter(c => String(c[0]).includes('same key'))).toEqual([]);
    } finally {
      [croissant.cross, painslait.cross] = saved;
      error.mockRestore();
    }
  });

  it('side panel has no handle', () => {
    renderDrawer(0, { sel: 'croissant' }, 1280);
    expect(header().children).toHaveLength(1);
  });
});
