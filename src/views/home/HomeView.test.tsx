import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { HomeView } from './HomeView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderHome = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, ...initial }}>
      <HomeView />
      <Probe />
    </AppProvider>,
  );

beforeEach(() => {
  // "En ce moment" and the bundles follow the device clock: pin it to 2 October (autumn).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 12));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('HomeView', () => {
  it('shows only the greeting, the current range and the bundles of the week (shop request)', () => {
    renderHome(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bonjour !');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['La gamme actuelle', 'Les bundles de la semaine']);
    const range = screen.getByRole('region', { name: 'La gamme actuelle' });
    expect(within(range).getByRole('article', { name: 'Automne' })).toBeTruthy();
    // range first, then the bundles
    const bundles = screen.getAllByRole('region', { name: 'Les bundles de la semaine' })[0];
    expect(range.compareDocumentPosition(bundles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // gone from the home page: quick asks, remark form, targets, onboarding banner, next season, best sellers
    expect(screen.queryByRole('group', { name: 'Le client demande…' })).toBeNull();
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryByText('Objectifs')).toBeNull();
    expect(screen.queryByText(/Formation vente en \d+ modules/)).toBeNull();
    expect(screen.queryByText('À préparer')).toBeNull();
    expect(screen.queryByText('Les plus vendus')).toBeNull();
    expect(screen.getAllByText('En ce moment')).toHaveLength(1);
  });

  it('bundles before the period (2 October): the weekly pattern, "Dès le jeudi 15 octobre"', () => {
    renderHome(0);
    expect(screen.getByText('Dès le jeudi 15 octobre')).toBeTruthy();
    expect(screen.getByText('Du 15 octobre au 15 décembre')).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').slice(1).map(h => h.textContent)).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']);
    // sample data, no shop: every bundle, the shop-only one says where
    expect(within(table).getAllByRole('rowheader')).toHaveLength(8);
    const lunch = within(table).getByRole('rowheader', { name: /^Le lunch/ }).closest('tr')!;
    expect([...lunch.querySelectorAll('td')].map(td => td.textContent!.replace(/\u00a0/g, ' '))).toEqual(['11 → 14 h', '11 → 14 h', '11 → 14 h', '11 → 14 h', '11 → 14 h', '', '']);
    expect(within(lunch).getByText('8,50 €')).toBeTruthy();
    expect(within(table).getByText('Seulement à Gosselies, Halle, Sombreffe · Halle : ½ quiche + ½ tarte')).toBeTruthy();
  });

  it('bundles during the period: dates and today\'s column (Friday 16 October)', () => {
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    renderHome(0);
    expect(screen.queryByText(/^Dès le/)).toBeNull();
    const heads = within(screen.getByRole('table')).getAllByRole('columnheader').slice(1);
    expect(heads.map(h => h.textContent)).toEqual(['Lun12', 'Mar13', 'Mer14', 'Jeu15', 'Ven16 (Aujourd\'hui)', 'Sam17', 'Dim18']);
    // Monday to Wednesday are before the period
    const petitDej = screen.getByRole('rowheader', { name: /^Le petit-déj/ }).closest('tr')!;
    expect([...petitDej.querySelectorAll('td')].map(td => td.textContent!.replace(/\u00a0/g, ' '))).toEqual(['', '', '', 'avant 11 h', 'avant 11 h', '', '']);
  });

  it('renders in NL', () => {
    renderHome(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Goedendag!');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Het huidige assortiment', 'De bundels van de week']);
    expect(screen.getByRole('heading', { level: 3, name: 'Herfst' })).toBeTruthy();
    expect(screen.getByText('Vanaf donderdag 15 oktober')).toBeTruthy();
    expect(screen.queryByText(/Verkoopopleiding/)).toBeNull();
  });

  it('shows every season running this month (December: Saint-Nicolas and Christmas)', () => {
    vi.setSystemTime(new Date(2026, 11, 3, 12));
    renderHome(0);
    const seasons = screen.getAllByRole('article');
    expect(seasons).toHaveLength(2);
    expect(seasons[0]).toBe(screen.getByRole('article', { name: 'Saint-Nicolas' }));
    expect(seasons[1]).toBe(screen.getByRole('article', { name: 'Noël & Nouvel An' }));
  });

  it('after the period, no bundles block', () => {
    vi.setSystemTime(new Date(2026, 11, 20, 12));
    renderHome(0);
    expect(screen.queryByText('Les bundles de la semaine')).toBeNull();
  });

  it('a product of the season of the moment opens its product sheet', () => {
    renderHome(0);
    const season = screen.getByRole('article', { name: 'Automne' });
    expect(within(season).getByText('Offre 4 + 1 sur la brioche croustillante.')).toBeTruthy();
    fireEvent.click(within(season).getByText('Brioche croustillante').closest('button')!);
    expect(state()).toMatchObject({ sel: 'brioche', stack: [] });
  });
});
