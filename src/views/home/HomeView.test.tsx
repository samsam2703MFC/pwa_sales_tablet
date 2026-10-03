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
    const season = within(range).getByRole('article', { name: 'Automne' });
    // the season's products: rounded tiles, two per row (name and price)
    const tiles = within(within(season).getByRole('group', { name: 'Automne' })).getAllByRole('button');
    expect(tiles.map(b => b.textContent)).toEqual(['Brioche croustillante4,20 €pièce']);
    // range first, then the bundles
    const bundles = screen.getByRole('region', { name: 'Les bundles de la semaine' });
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

  /** A bundle card by name, its texts with no-break spaces read as spaces. */
  const bundle = (name: string) => screen.getByRole('article', { name });
  const text = (el: Element) => el.textContent!.replace(/\u00a0/g, ' ');

  it('bundles before the period (2 October): rounded cards, the weekly pattern, "Dès le jeudi 15 octobre"', () => {
    renderHome(0);
    expect(screen.getByText('Dès le jeudi 15 octobre')).toBeTruthy();
    expect(screen.getByText('Du 15 octobre au 15 décembre')).toBeTruthy();
    // sample data, no shop: every bundle, as a list of cards; the shop-only one says where
    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards).toHaveLength(8);
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent).slice(1)).toEqual([
      'Offre site', 'Le petit-déj', 'Le lunch', 'Formule bureau', 'Le goûter', 'Quiche + tarte', '4 + 2 croissants', 'Grands formats',
    ]);
    const lunch = bundle('Le lunch');
    expect(within(lunch).getByText('8,50 €')).toBeTruthy();
    expect(within(lunch).getByText('Flip & Flap + boisson + éclair')).toBeTruthy();
    expect(text(within(lunch).getByText(/^Lun → ven/))).toBe('Lun → ven · 11 → 14 h');
    expect(text(within(bundle('Le goûter')).getByText(/^Tous les jours/))).toBe('Tous les jours · 14 → 17 h');
    expect(within(bundle('Quiche + tarte')).getByText('Seulement à Gosselies, Halle, Sombreffe · Halle : ½ quiche + ½ tarte')).toBeTruthy();
    expect(within(bundle('4 + 2 croissants')).getByText('Click & collect')).toBeTruthy();
    // nothing runs "today" before the period
    expect(screen.queryByText(/^Aujourd'hui/)).toBeNull();
  });

  it('bundles during the period (Friday 16 October): "Aujourd\'hui" on the bundles of the day', () => {
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    renderHome(0);
    expect(screen.queryByText(/^Dès le/)).toBeNull();
    expect(text(within(bundle('Le petit-déj')).getByText(/^Aujourd'hui/))).toBe("Aujourd'hui · avant 11 h");
    // Monday to Wednesday are before the period
    expect(text(within(bundle('Le petit-déj')).getByText(/^Jeu, ven/))).toBe('Jeu, ven · avant 11 h');
    expect(within(bundle('4 + 2 croissants')).queryByText(/^Aujourd'hui/)).toBeNull();
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
    const seasons = within(screen.getByRole('region', { name: 'La gamme actuelle' })).getAllByRole('article');
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
