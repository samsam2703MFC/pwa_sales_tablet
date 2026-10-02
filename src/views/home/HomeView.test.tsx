import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
});
afterEach(cleanup);

describe('HomeView', () => {
  it('renders the greeting and the 6 quick asks in FR', () => {
    renderHome(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bonjour !');
    expect(screen.getByRole('group', { name: 'Le client demande…' }).querySelectorAll('button')).toHaveLength(6);
  });

  it('renders in NL', () => {
    renderHome(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Goedendag!');
    expect(screen.getByText('Verkoopopleiding in 7 modules · 1 min lezen per module')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Topverkopers' })).toBeTruthy();
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

  it('the onboarding banner opens the module list', () => {
    renderHome(0, { onbMod: 3 });
    fireEvent.click(tile('Formation vente en 7 modules · 1 min de lecture par module'));
    expect(state()).toMatchObject({ view: 'onb', onbMod: -1 });
  });

  it('a best seller opens its product sheet', () => {
    renderHome(0);
    fireEvent.click(tile('Croissant pur beurre'));
    expect(state()).toMatchObject({ sel: 'croissant', stack: [] });
  });
});
