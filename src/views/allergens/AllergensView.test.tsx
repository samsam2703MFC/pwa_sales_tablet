import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { AllergensView } from './AllergensView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderAl = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, view: 'al', ...initial }}>
      <AllergensView />
      <Probe />
    </AppProvider>,
  );

const chip = (name: string) => within(screen.getByRole('group')).getByRole('button', { name });
/** The live counts region (the Probe's <output> is a status too). */
const counts = () => within(document.querySelector('section')!).getByRole('status');
/** The visible counts line (hidden from assistive tech, which gets the live region). */
const visibleCounts = () => screen.queryByText((_, el) => el?.tagName === 'DIV' && el.getAttribute('aria-hidden') === 'true');
const row = (product: string) => screen.getByRole('rowheader', { name: product }).closest('[role="row"]') as HTMLElement;

afterEach(cleanup);

describe('AllergensView', () => {
  it('no selection: 14 chips, no reset, no counts, no status pill', () => {
    renderAl(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Allergènes');
    expect(within(screen.getByRole('group', { name: 'Le client est allergique à :' })).getAllByRole('button')).toHaveLength(14);
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
    expect(counts().textContent).toBe('');
    expect(visibleCounts()).toBeNull();
    expect(screen.queryByText('OK')).toBeNull();
  });

  it('each chip and each column head shows the allergen pictogram (decorative: names unchanged)', () => {
    renderAl(0);
    const chips = within(screen.getByRole('group', { name: 'Le client est allergique à :' })).getAllByRole('button');
    expect(chips.every(b => b.querySelector('svg[aria-hidden="true"]'))).toBe(true);
    expect(chip('Gluten').textContent).toBe('Gluten');
    const heads = within(screen.getByRole('table')).getAllByRole('columnheader').slice(2);
    expect(heads.every(h => h.querySelector('svg[aria-hidden="true"]'))).toBe(true);
  });

  it('table semantics: 16 column headers (named), one row per product', () => {
    renderAl(0);
    // the horizontally scrolling card is keyboard-reachable
    const scroller = screen.getByRole('region', { name: 'Allergènes' });
    expect(scroller.tabIndex).toBe(0);
    const table = within(scroller).getByRole('table', { name: 'Allergènes' });
    const heads = within(table).getAllByRole('columnheader');
    expect(heads).toHaveLength(16);
    expect(heads[2].getAttribute('aria-label')).toBe('Gluten');
    expect(heads[2].getAttribute('title')).toBe('Gluten');
    expect(heads[2].textContent).toBe('GLU');
    expect(within(table).getAllByRole('rowheader')).toHaveLength(27);
    // dots are labelled images
    expect(within(row('Croissant pur beurre')).getAllByRole('img', { name: 'Contient' })).toHaveLength(3);
    expect(within(row('Croissant pur beurre')).getAllByRole('img', { name: 'Traces possibles' })).toHaveLength(2);
  });

  it('toggling chips updates the selection, pills and counts', () => {
    renderAl(0);
    fireEvent.click(chip('Gluten'));
    expect(state().ex).toEqual(['gluten']);
    expect(chip('Gluten').getAttribute('aria-pressed')).toBe('true');
    expect(counts().textContent).toBe('3 produits compatibles, 2 avec traces possibles');
    expect(visibleCounts()?.textContent).toBe('3 produits compatibles2 avec traces possibles');
    expect(within(row('Limonade maison')).getByText('OK')).toBeTruthy();
    expect(within(row('Café & latte')).getByText('Traces')).toBeTruthy();
    expect(within(row('Pistolet')).getByText('Ne convient pas')).toBeTruthy();

    fireEvent.click(chip('Lait'));
    expect(state().ex).toEqual(['gluten', 'lait']);
    expect(counts().textContent).toBe('3 produits compatibles, 0 avec traces possibles');

    fireEvent.click(chip('Gluten'));
    expect(state().ex).toEqual(['lait']);
    expect(chip('Gluten').getAttribute('aria-pressed')).toBe('false');
  });

  it('reset clears the selection', () => {
    renderAl(0, { ex: ['gluten', 'sesame'] });
    const live = counts();
    fireEvent.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(state().ex).toEqual([]);
    // the live region stays mounted (only emptied), so the next selection is announced
    expect(counts()).toBe(live);
    expect(live.textContent).toBe('');
    expect(visibleCounts()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
  });

  it('reset: focus moves to the first chip instead of being lost with the button', () => {
    renderAl(0, { ex: ['lait'] });
    const reset = screen.getByRole('button', { name: 'Effacer' });
    reset.focus();
    fireEvent.click(reset);
    expect(document.activeElement).toBe(chip('Gluten'));
  });

  it('home quick-ask selection (noix + arachides) in NL', () => {
    renderAl(1, { ex: ['noix', 'arach'] });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Allergenen');
    expect(chip('Noten').getAttribute('aria-pressed')).toBe('true');
    expect(chip('Pinda').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Wissen' })).toBeTruthy();
    expect(counts().textContent).toMatch(/^\d+ geschikte producten, \d+ met mogelijke sporen$/);
    expect(within(row('Pistolet')).getByText('OK')).toBeTruthy();
    expect(within(row('Croissant met roomboter')).getByText('Sporen')).toBeTruthy();
    expect(within(row('Croissant met roomboter')).getAllByRole('img', { name: 'Bevat' })).toHaveLength(3);
  });

  it('the product name opens the product sheet', () => {
    renderAl(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pistolet' }));
    expect(state().sel).toBe('pistolet');
  });
});
