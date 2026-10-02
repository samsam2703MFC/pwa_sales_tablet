import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOK } from '../data/book';
import type { Lang } from '../data/types';
import { AppProvider, useApp, type AppState } from '../state/store';
import { AppShell } from './AppShell';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const setWidth = (w: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });

const renderShell = (width: number, lang: Lang = 0, initial: Partial<AppState> = {}, page: ReactNode = <p>page</p>) => {
  setWidth(width);
  return render(
    <AppProvider initial={{ lang, ...initial }}>
      <AppShell>{page}</AppShell>
      <Probe />
    </AppProvider>,
  );
};

const btn = (name: string) => screen.getByRole('button', { name });
/** The search results status (the Probe's <output> also has the status role). */
const resultsStatus = () => within(document.querySelector('header')!).getByRole('status');
/** Visible children of the header row (the results status is screen-reader only). */
const headerItems = () => [...document.querySelector('header')!.children].filter(c => !c.classList.contains('sr-only'));

/** Stand-in pages: the home page has a tile that leaves it (like "Le client demande…"), the others a title. */
function Pages() {
  const { state, actions } = useApp();
  return state.view === 'home'
    ? <button type="button" onClick={() => actions.go('al', { ex: ['gluten'] })}>tile</button>
    : <h1>title {state.view}</h1>;
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

/** Buttons of the bottom tab bar (the only navigation, in both orientations). */
const tabs = () => within(screen.getByRole('navigation')).getAllByRole('button');

describe('AppShell — landscape (≥ 1000 px)', () => {
  it('renders the top bar, the 5 tabs, the page and the date, without sidebar', () => {
    renderShell(1280);
    // Shop request: no left sidebar any more, the tab bar is the navigation in landscape too.
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Navigation' })).toBeTruthy();
    expect(tabs().map(b => b.textContent)).toEqual(['Accueil', 'La gamme', 'Allergènes', 'FAQ', 'Plus']);
    expect(btn('Accueil').getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('page')).toBeTruthy();
    // Top bar: logo, "Book vendeuses", data-source pill, FR/NL toggle.
    expect(screen.getByRole('img', { name: "L'Atelier By" })).toBeTruthy();
    expect(screen.getByText('Book vendeuses')).toBeTruthy();
    expect(screen.getByText("Données d'exemple")).toBeTruthy();
    expect(screen.queryByText(/à remplacer par les fiches produit officielles/)).toBeNull();
    expect(screen.getByRole('group', { name: 'Langue' })).toBeTruthy();
    expect(headerItems()).toHaveLength(2); // search field + date
  });

  it('navigates and moves the active item', () => {
    renderShell(1280);
    fireEvent.click(btn('La gamme'));
    expect(state().view).toBe('gamme');
    expect(btn('La gamme').getAttribute('aria-current')).toBe('page');
    expect(btn('Accueil').getAttribute('aria-current')).toBeNull();
  });

  it('while searching, the tab bar keeps the section highlighted (prototype tab()); a tab click resets the search', () => {
    renderShell(1280, 0, { view: 'gamme' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'beurre' } });
    expect(state().q).toBe('beurre');
    // The tab bar does not look at the search text (unlike the former sidebar).
    expect(screen.getAllByRole('button', { current: 'page' }).map(b => b.textContent)).toEqual(['La gamme']);
    fireEvent.click(btn('Allergènes'));
    expect(state()).toMatchObject({ view: 'al', q: '' });
    // Even the tab of the current section leaves the results.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'noix' } });
    fireEvent.click(btn('Allergènes'));
    expect(state()).toMatchObject({ view: 'al', q: '' });
  });

  it('"Effacer" from the keyboard clears the query and keeps the focus in the field', () => {
    renderShell(1280);
    const input = screen.getByRole('textbox');
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
    fireEvent.change(input, { target: { value: 'pain' } });
    fireEvent.click(btn('Effacer'), { detail: 0 }); // Enter / Space on the button
    expect(state().q).toBe('');
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('"Effacer" tapped does not focus the field (no on-screen keyboard), like the prototype', () => {
    renderShell(1280);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'pain' } });
    fireEvent.click(btn('Effacer'), { detail: 1 });
    expect(state().q).toBe('');
    expect(document.activeElement).not.toBe(input);
  });

  it('the keyboard "Search" key (Enter) closes the keyboard (blur) and keeps the query', () => {
    renderShell(1280);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.getAttribute('enterkeyhint')).toBe('search');
    input.focus();
    fireEvent.change(input, { target: { value: 'pain' } });
    // While an IME composition is in progress, Enter confirms the composition: no blur.
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'a' });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('pain');
    expect(state().q).toBe('pain');
  });

  it('announces the number of results in a status that is always there', () => {
    renderShell(1280);
    const status = resultsStatus();
    expect(status.textContent).toBe('');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'cro' } });
    expect(resultsStatus()).toBe(status);
    expect(status.textContent).toBe('9 produits, 4 questions');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'gluten' } });
    expect(status.textContent).toMatch(/^\d+ produits, \d+ questions?$/);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'croz' } });
    expect(status.textContent).toBe('Aucun résultat.');
    fireEvent.click(btn('Effacer'));
    expect(status.textContent).toBe('');
  });

  it('announces the results in NL', () => {
    renderShell(1280, 1);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'cro' } });
    expect(resultsStatus().textContent).toBe('9 producten, 4 vragen');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'croz' } });
    expect(resultsStatus().textContent).toBe('Geen resultaten.');
  });

  it('after a section change, focus goes to the new page title when its trigger went away', () => {
    renderShell(1280, 0, {}, <Pages />);
    const tile = btn('tile');
    tile.focus();
    fireEvent.click(tile);
    expect(state()).toMatchObject({ view: 'al', ex: ['gluten'] });
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(document.activeElement).toBe(h1);
    expect(h1.tabIndex).toBe(-1);
    // A tab keeps its focus.
    const item = btn('La gamme');
    item.focus();
    fireEvent.click(item);
    expect(state().view).toBe('gamme');
    expect(document.activeElement).toBe(item);
  });

  it('makes the tab bar and the page inert while the product sheet (side panel) is open', () => {
    renderShell(1280, 0, { sel: BOOK.products[0].id });
    const main = screen.getByRole('main', { hidden: true });
    const bar = document.querySelector('nav')!;
    expect(main.hasAttribute('inert')).toBe(true);
    expect(bar.hasAttribute('inert')).toBe(true);
    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('[inert]')).toBeNull();
    // Landscape: side panel, no handle in its header (bottom sheet in portrait).
    expect(dialog.firstElementChild!.children).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(main.hasAttribute('inert')).toBe(false);
    expect(bar.hasAttribute('inert')).toBe(false);
  });

  it('an unknown selected id opens nothing and leaves the page usable', () => {
    renderShell(1280, 0, { sel: 'nope' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('main').hasAttribute('inert')).toBe(false);
  });

  it('switches language (labels, pressed state, document lang)', () => {
    renderShell(1280);
    expect(btn('FR').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn('NL'));
    expect(state().lang).toBe(1);
    expect(btn('NL').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('navigation', { name: 'Navigatie' })).toBeTruthy();
    expect(tabs().map(b => b.textContent)).toEqual(['Start', 'Assortiment', 'Allergenen', 'FAQ', 'Meer']);
    expect(screen.getByRole('group', { name: 'Taal' })).toBeTruthy();
    expect(screen.getByText('Voorbeeldgegevens')).toBeTruthy();
    expect(screen.getByPlaceholderText('Zoek een product, ingrediënt, vraag…')).toBeTruthy();
    expect(document.documentElement.lang).toBe('nl');
    // The "Plus" sheet follows the language.
    fireEvent.click(btn('Meer'));
    const dialog = screen.getByRole('dialog', { name: 'Meer' });
    expect(within(dialog).getByText('Verkoop')).toBeTruthy();
    expect(within(dialog).getByText('Opleiding')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'De basis' })).toBeTruthy();
  });

  it('opens the "Plus" sheet too (Vente / Formation); "Les bases" opens its section', () => {
    renderShell(1280);
    fireEvent.click(btn('Plus'));
    const dialog = screen.getByRole('dialog', { name: 'Plus' });
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByRole('main').hasAttribute('inert')).toBe(true);
    expect(within(dialog).getByText('Vente')).toBeTruthy();
    expect(within(dialog).getByText('Formation')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Les bases' }));
    expect(state()).toMatchObject({ view: 'bases', more: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tabs().filter(b => b.className.includes('on')).map(b => b.textContent)).toEqual(['Plus']);
    expect(document.activeElement).toBe(btn('Plus'));
  });
});

describe('AppShell — portrait (< 1000 px)', () => {
  it('renders the compact top bar and the 5 tabs, no sidebar nor date', () => {
    renderShell(820);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(tabs().map(b => b.textContent)).toEqual(['Accueil', 'La gamme', 'Allergènes', 'FAQ', 'Plus']);
    expect(tabs()[0].getAttribute('aria-current')).toBe('page');
    expect(headerItems()).toHaveLength(1);
    expect(screen.getByText('Book vendeuses')).toBeTruthy();
  });

  it('tabs navigate; "Plus" is highlighted for sections without a tab', () => {
    renderShell(820, 0, { view: 'stats' });
    expect(tabs().filter(b => b.className.includes('on')).map(b => b.textContent)).toEqual(['Plus']);
    fireEvent.click(tabs()[3]);
    expect(state().view).toBe('faq');
    expect(tabs()[3].getAttribute('aria-current')).toBe('page');
  });

  it('opens the "Plus" sheet, then a tile navigates and closes it', () => {
    renderShell(820);
    fireEvent.click(btn('Plus'));
    const dialog = screen.getByRole('dialog', { name: 'Plus' });
    expect(document.activeElement).toBe(dialog);
    expect(btn('Plus').getAttribute('aria-expanded')).toBe('true');
    expect(within(dialog).getAllByRole('button').map(b => b.textContent))
      .toEqual(['Saisons', 'Vendre plus', 'Services', 'Conservation', 'Statistiques', 'Objectifs', 'Remarques clients', 'Les bases', 'Onboarding']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saisons' }));
    expect(state()).toMatchObject({ view: 'saisons', more: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(btn('Plus'));
  });

  it('makes the page and the tab bar inert while the sheet is open (modal)', () => {
    renderShell(820);
    const main = screen.getByRole('main');
    const bar = screen.getByRole('navigation');
    expect(main.hasAttribute('inert')).toBe(false);
    expect(bar.hasAttribute('inert')).toBe(false);
    fireEvent.click(btn('Plus'));
    expect(main.hasAttribute('inert')).toBe(true);
    expect(bar.hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('dialog').hasAttribute('inert')).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(main.hasAttribute('inert')).toBe(false);
    expect(bar.hasAttribute('inert')).toBe(false);
  });

  it('makes the page and the tab bar inert while the product sheet is open', () => {
    renderShell(820, 0, { sel: BOOK.products[0].id });
    const main = screen.getByRole('main', { hidden: true });
    const bar = document.querySelector('nav')!;
    expect(main.hasAttribute('inert')).toBe(true);
    expect(bar.hasAttribute('inert')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(main.hasAttribute('inert')).toBe(false);
    expect(bar.hasAttribute('inert')).toBe(false);
  });

  it('closes the sheet with the scrim or Escape, focus back on the tab', () => {
    renderShell(820, 1);
    fireEvent.click(btn('Meer'));
    expect(screen.getByRole('dialog', { name: 'Meer' })).toBeTruthy();
    fireEvent.click(screen.getByRole('dialog').previousElementSibling!); // the scrim
    expect(state().more).toBe(false);
    expect(document.activeElement).toBe(btn('Meer'));
    fireEvent.click(btn('Meer'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(state().more).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(btn('Meer'));
  });

  it('the product sheet is a bottom sheet (handle in its header)', () => {
    renderShell(820, 0, { sel: BOOK.products[0].id });
    expect(screen.getByRole('dialog').firstElementChild!.children).toHaveLength(2); // handle row + button row
  });

  it('a sheet left open stays open in landscape: the same navigation in both orientations', () => {
    renderShell(820, 0, { more: true });
    expect(screen.getByRole('dialog', { name: 'Plus' })).toBeTruthy();
    cleanup();
    renderShell(1280, 0, { more: true });
    expect(screen.getByRole('dialog', { name: 'Plus' })).toBeTruthy();
    expect(screen.getByRole('main', { hidden: true }).hasAttribute('inert')).toBe(true);
  });
});
