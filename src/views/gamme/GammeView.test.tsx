import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { GammeView } from './GammeView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderGamme = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, view: 'gamme', ...initial }}>
      <GammeView />
      <Probe />
    </AppProvider>,
  );

const groupTitles = () => screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
const chips = () => within(screen.getByRole('group')).getAllByRole('button');
const vegan = () => chips()[0];

afterEach(cleanup);

describe('GammeView', () => {
  it('renders the title, the VEGAN toggle, "Tout" + 6 categories and every group (FR)', () => {
    renderGamme(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('La gamme');
    expect(chips().map(b => b.textContent)).toEqual(['VEGAN', 'Tout', 'Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(groupTitles()).toEqual(['Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers']);
    expect(screen.getByRole('button', { name: 'Tout' }).getAttribute('aria-pressed')).toBe('true');
    expect(vegan().getAttribute('aria-pressed')).toBe('false');
  });

  it('a card shows each allergen code with its pictogram', () => {
    renderGamme(0);
    const card = screen.getByRole('button', { name: /^Croissant pur beurre/ });
    const codes = [...card.querySelectorAll('svg[aria-hidden="true"]')].map(svg => svg.parentElement!.textContent);
    expect(codes).toEqual(['GLU', 'LAI', 'ŒUF']);
  });

  it('renders in NL', () => {
    renderGamme(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Het assortiment');
    expect(chips()[1].textContent).toBe('Alles');
    expect(groupTitles()[0]).toBe('Viennoiserie');
  });

  it('VEGAN toggles the filter and its label', () => {
    renderGamme(0);
    fireEvent.click(vegan());
    expect(state().vegan).toBe(true);
    expect(vegan().textContent).toBe('VEGAN ✕');
    expect(vegan().getAttribute('aria-pressed')).toBe('true');
    // The ✕ is decorative: the accessible name stays "VEGAN".
    expect(screen.getByRole('button', { name: 'VEGAN', pressed: true })).toBe(vegan());
    expect(groupTitles()).toEqual(['Pains', 'Snacking', 'Boissons']);
    fireEvent.click(vegan());
    expect(state().vegan).toBe(false);
    expect(vegan().textContent).toBe('VEGAN');
  });

  it('a category chip keeps only that group, with its count', () => {
    renderGamme(0);
    fireEvent.click(screen.getByRole('button', { name: 'Boissons' }));
    expect(state().cat).toBe('bois');
    expect(screen.getByRole('button', { name: 'Boissons' }).getAttribute('aria-pressed')).toBe('true');
    expect(groupTitles()).toEqual(['Boissons']);
    expect(screen.getByRole('heading', { level: 2, name: 'Boissons' }).nextElementSibling?.textContent).toBe('3');
  });

  it('shows nothing when VEGAN and the category have no product in common', () => {
    renderGamme(0, { vegan: true, cat: 'vien' });
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
  });

  it('a card opens the product sheet', () => {
    renderGamme(0, { cat: 'pain' });
    fireEvent.click(screen.getByText('Pistolet').closest('button')!);
    expect(state().sel).toBe('pistolet');
  });
});
