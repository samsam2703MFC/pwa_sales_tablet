import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { SearchView } from './SearchView';

function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderSearch = (q: string, lang: Lang = 0) =>
  render(
    <AppProvider initial={{ lang, q }}>
      <SearchView />
      <Probe />
    </AppProvider>,
  );

afterEach(cleanup);

describe('SearchView', () => {
  it('lists the matching products (FR)', () => {
    renderSearch('beurre');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Résultats pour « beurre »');
    expect(screen.getAllByRole('button')).toHaveLength(14);
    expect(screen.getByText('Croissant pur beurre')).toBeTruthy();
    expect(screen.queryByText('Aucun résultat.')).toBeNull();
    expect(screen.queryByText('Questions')).toBeNull();
  });

  it('shows "Aucun résultat." / "Geen resultaten."', () => {
    renderSearch('zzz');
    expect(screen.getByText('Aucun résultat.')).toBeTruthy();
    cleanup();
    renderSearch('noix', 1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Resultaten voor « noix »');
    expect(screen.getByText('Geen resultaten.')).toBeTruthy();
  });

  it('shows products and questions in the current language (NL)', () => {
    renderSearch('taart', 1);
    expect(screen.getByText('Rijsttaart')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Vragen');
    expect(screen.getByText('Kan ik een verjaardagstaart bestellen?')).toBeTruthy();
  });

  it('opens the product sheet from a card', () => {
    renderSearch('croissant');
    fireEvent.click(screen.getByRole('button', { name: /Croissant pur beurre/ }));
    expect(state().sel).toBe('croissant');
  });
});
