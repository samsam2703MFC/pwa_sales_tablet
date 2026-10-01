import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { StatsView } from './StatsView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderStats = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, view: 'stats', ...initial }}>
      <StatsView />
      <Probe />
    </AppProvider>,
  );

const table = (name: string) => screen.getByRole('table', { name });
const rowOf = (t: HTMLElement, seller: string) =>
  within(t).getByRole('rowheader', { name: seller }).closest('[role="row"]') as HTMLElement;
const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map(c => c.textContent);

afterEach(cleanup);

describe('StatsView', () => {
  it('FR header, period selector and seller chips', () => {
    renderStats(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Statistiques');
    expect(screen.getByText('Chiffres d’exemple — à connecter à la caisse.')).toBeTruthy();
    const periods = within(screen.getByRole('group', { name: 'Période' })).getAllByRole('button');
    expect(periods.map(b => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ["Aujourd'hui", 'false'], ['Cette semaine', 'true'], ['Ce mois', 'false'],
    ]);
    const chips = within(screen.getByRole('group', { name: 'Vendeuses' })).getAllByRole('button');
    expect(chips.map(b => b.textContent)).toEqual(['Équipe', 'Sophie', 'Inès', 'Marie', 'Laura', 'Chloé']);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('team week KPIs: revenue without status, the others with objective + status', () => {
    renderStats(0);
    expect(screen.getByText('2138 tickets')).toBeTruthy();
    expect(screen.getByText('9,16 €')).toBeTruthy();
    expect(screen.getByText('Objectif 9,50 €')).toBeTruthy();
    expect(screen.getAllByText('À atteindre')).toHaveLength(1);
    expect(screen.getAllByText('Atteint')).toHaveLength(2);
    expect(screen.getByText('Objectif 450 pcs')).toBeTruthy();
  });

  it('period and seller chip update the store and the figures', () => {
    renderStats(0);
    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    expect(state().stPer).toBe('day');
    fireEvent.click(within(screen.getByRole('group', { name: 'Vendeuses' })).getByRole('button', { name: 'Laura' }));
    expect(state().stSel).toBe('laura');
    expect(screen.getByText('61 tickets')).toBeTruthy();
    expect(screen.getByText('Objectif 15 pcs')).toBeTruthy();
    expect(screen.queryByText('Atteint')).toBeNull();
    expect(screen.getAllByText('À atteindre')).toHaveLength(3);
  });

  it('7-day chart: 7 labelled columns, last one is today', () => {
    renderStats(1);
    const list = screen.getByRole('list', { name: 'Omzet · 7 laatste dagen' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items[6].textContent).toBe('3.300 €Zo');
  });

  it('best sellers open the product sheet', () => {
    renderStats(0);
    const top = screen.getByRole('group', { name: 'Les plus vendus' });
    const items = within(top).getAllByRole('button');
    expect(items.map(b => b.textContent)).toEqual([
      '1Pistolet600 pcs', '2Croissant pur beurre402 pcs', '3Cookie chocolat noisette225 pcs', '4Club poulet curry206 pcs', '5Brioche croustillante186 pcs',
    ]);
    fireEvent.click(items[1]);
    expect(state().sel).toBe('croissant');
  });

  it('ranking table semantics (NL): 6 column headers, rows by revenue', () => {
    renderStats(1);
    const t = table('Teamoverzicht');
    const heads = within(t).getAllByRole('columnheader');
    expect(heads.map(h => h.textContent || h.getAttribute('aria-label'))).toEqual([
      'Positie', 'Verkoopster', 'Omzet', 'Gemiddeld ticket', 'Bijverkoop', 'Seizoensproducten',
    ]);
    expect(within(t).getAllByRole('rowheader').map(r => r.textContent)).toEqual(['Marie', 'Sophie', 'Inès', 'Chloé', 'Laura']);
    expect(cells(rowOf(t, 'Marie'))).toEqual(['1', '4.620 €', '9,83 €', '36 %', '118']);
  });

  it('ranking row tap selects the seller, second tap goes back to the team', () => {
    renderStats(0, { stPer: 'month' });
    const t = table("Classement de l'équipe");
    // tap on a figure of the row (not on the name button)
    fireEvent.click(within(rowOf(t, 'Marie')).getAllByRole('cell')[1]);
    expect(state().stSel).toBe('marie');
    expect(within(rowOf(t, 'Marie')).getByRole('button').getAttribute('aria-pressed')).toBe('true');
    // chip and ranking row agree
    expect(screen.getAllByRole('button', { name: 'Marie', pressed: true })).toHaveLength(2);
    // the name button (keyboard / screen readers) toggles exactly once
    fireEvent.click(within(rowOf(t, 'Marie')).getByRole('button'));
    expect(state().stSel).toBe('team');
    fireEvent.click(within(rowOf(t, 'Laura')).getByRole('button'));
    expect(state().stSel).toBe('laura');
  });
});
