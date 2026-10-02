import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { ConservationView } from './ConservationView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderCons = (lang: Lang = 0) =>
  render(
    <AppProvider initial={{ lang, view: 'cons' }}>
      <ConservationView />
      <Probe />
    </AppProvider>,
  );

afterEach(cleanup);

describe('ConservationView', () => {
  it('renders one block per category with a row per product (FR)', () => {
    renderCons(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Conservation & DLC');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      'Viennoiseries', 'Pains', 'Pâtisseries', 'Snacking', 'Boissons', 'Saisonniers',
    ]);
    expect(screen.getAllByRole('button')).toHaveLength(27);
    expect(screen.getAllByText('Immédiat')).toHaveLength(2);
    expect(screen.getByText('30 jours')).toBeTruthy();
  });

  it('renders in NL', () => {
    renderCons(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bewaring & houdbaarheid');
    expect(screen.getAllByText('Onmiddellijk')).toHaveLength(2);
    expect(screen.getByText('21 dagen')).toBeTruthy();
    expect(screen.getByText('Meteen drinken.')).toBeTruthy();
  });

  it('a product name opens the product sheet', () => {
    renderCons(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tarte au riz' }));
    expect(state().sel).toBe('tarteriz');
  });
});
