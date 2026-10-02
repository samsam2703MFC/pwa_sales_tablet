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

/** Language switch, like the shell's FR/NL toggle. */
function SwitchLang() {
  const { actions } = useApp();
  return <button type="button" data-testid="to-nl" onClick={() => actions.setLang(1)} />;
}

const renderHome = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, ...initial }}>
      <HomeView />
      <Probe />
      <SwitchLang />
    </AppProvider>,
  );

const tile = (label: string) => screen.getByText(label, { exact: true }).closest('button')!;

/** jsdom has no scrolling: record the "back to top" of each section change instead. */
const scrollTo = vi.fn();
beforeEach(() => {
  scrollTo.mockClear();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  // "En ce moment" follows the device clock: pin it to 2 October (autumn).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 12));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('HomeView', () => {
  it('renders the greeting and the 6 quick asks in FR', () => {
    renderHome(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bonjour !');
    expect(screen.getByRole('group', { name: 'Le client demande…' }).querySelectorAll('button')).toHaveLength(6);
  });

  it('shows, in order: greeting, quick asks, customer remark form, season of the moment', () => {
    renderHome(0);
    const page = document.querySelector('section')!;
    const blocks = [
      screen.getByRole('heading', { level: 1 }),
      screen.getByRole('group', { name: 'Le client demande…' }),
      screen.getByRole('form', { name: "Remarque d'un client" }),
      screen.getByRole('article', { name: 'Automne' }),
    ];
    for (const b of blocks) expect(page.contains(b)).toBe(true);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i - 1].compareDocumentPosition(blocks[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // The objectives come from the BO: not shown with the bundled sample data (Objectives.test.tsx).
    expect(screen.queryByText('Objectifs')).toBeNull();
  });

  it('no longer has the onboarding banner, "À préparer" nor "Les plus vendus" (shop request)', () => {
    renderHome(0);
    expect(screen.queryByText(/Formation vente en \d+ modules/)).toBeNull();
    expect(screen.queryByText('À préparer')).toBeNull();
    expect(screen.queryByText('Les plus vendus')).toBeNull();
    // Only the season(s) of the moment: autumn in October, not Saint-Nicolas (next).
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(["Remarque d'un client", 'Automne']);
    expect(screen.getAllByText('En ce moment')).toHaveLength(1);
  });

  it('renders in NL', () => {
    renderHome(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Goedendag!');
    expect(screen.getByRole('group', { name: 'De klant vraagt…' }).querySelectorAll('button')).toHaveLength(6);
    expect(screen.getByRole('form', { name: 'Opmerking van een klant' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Herfst' })).toBeTruthy();
    expect(screen.queryByText(/Verkoopopleiding/)).toBeNull();
    expect(screen.queryByText('Topverkopers')).toBeNull();
  });

  it('shows every season running this month (December: Saint-Nicolas and Christmas)', () => {
    vi.setSystemTime(new Date(2026, 11, 3, 12));
    renderHome(0);
    const seasons = screen.getAllByRole('article');
    expect(seasons).toHaveLength(2);
    expect(seasons[0]).toBe(screen.getByRole('article', { name: 'Saint-Nicolas' }));
    expect(seasons[1]).toBe(screen.getByRole('article', { name: 'Noël & Nouvel An' }));
  });

  const cases: [string, Partial<AppState>][] = [
    ['Sans gluten ?', { view: 'al', ex: ['gluten'] }],
    ['Sans lait ?', { view: 'al', ex: ['lait'] }],
    ['Sans fruits à coque ?', { view: 'al', ex: ['noix', 'arach'] }],
    ['Quelque chose de vegan ?', { view: 'gamme', vegan: true, cat: 'all' }],
    ['Commander un gâteau', { view: 'svc' }],
    ['Un lunch rapide', { view: 'ventes' }],
  ];
  for (const [label, expected] of cases) {
    it(`"${label}" opens the pre-filtered section`, () => {
      renderHome(0, { cat: 'pain', sel: 'pistolet', stack: ['baguette'], more: true, onbMod: 2 });
      fireEvent.click(tile(label));
      expect(state()).toMatchObject({ ...expected, q: '', sel: null, stack: [], more: false, onbMod: -1 });
      if (!('cat' in expected)) expect(state().cat).toBe('pain');
      expect(scrollTo).toHaveBeenCalledWith(0, 0);
    });
  }

  it('updates the quick asks in place on a language switch (keeps the browser scroll anchor)', () => {
    renderHome(0);
    const before = tile('Sans lait ?');
    fireEvent.click(screen.getByTestId('to-nl'));
    expect(tile('Zonder melk?')).toBe(before);
  });

  it('a product of the season of the moment opens its product sheet', () => {
    renderHome(0);
    const season = screen.getByRole('article', { name: 'Automne' });
    expect(within(season).getByText('Offre 4 + 1 sur la brioche croustillante.')).toBeTruthy();
    fireEvent.click(within(season).getByText('Brioche croustillante').closest('button')!);
    expect(state()).toMatchObject({ sel: 'brioche', stack: [] });
  });
});
