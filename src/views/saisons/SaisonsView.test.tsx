import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOK, BOOK_SOURCE, setBook } from '../../data/book';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { SaisonsView } from './SaisonsView';

function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderSaisons = (lang: Lang = 0) =>
  render(
    <AppProvider initial={{ lang, view: 'saisons' }}>
      <SaisonsView />
      <Probe />
    </AppProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 1, 12)); // 1 October → autumn
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('SaisonsView', () => {
  it('renders the calendar: 12 months, current one marked, one row per season (FR)', () => {
    renderSaisons(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Saisons');
    const table = screen.getByRole('table', { name: 'Saisons' });
    const headers = Array.from(table.querySelectorAll('[role="columnheader"]')).map(h => h.textContent);
    // The corner header names the season column (sr-only), then the 12 months.
    expect(headers).toEqual(['Saisons', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']);
    expect(table.querySelector('[aria-current="date"]')?.textContent).toBe('Oct');
    expect(Array.from(table.querySelectorAll('[role="rowheader"]')).map(r => r.textContent)).toHaveLength(8);
    // Autumn row: bars on Sep, Oct, Nov (labelled for screen readers).
    const autumn = Array.from(table.querySelectorAll('[role="row"]')).find(r => r.textContent?.startsWith('Automne'))!;
    expect(Array.from(autumn.querySelectorAll('[role="cell"]')).map(c => c.textContent).filter(Boolean)).toEqual(['Sep', 'Oct', 'Nov']);
  });

  it('shows a card only for the season(s) running this month, with the "En ce moment" badge', () => {
    renderSaisons(0);
    // Card titles are h2 (right under the H1). October: autumn only; the others are only in the calendar.
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Automne']);
    expect(screen.getAllByText('En ce moment')).toHaveLength(1);
    expect(screen.getByText('En ce moment').previousElementSibling?.textContent).toBe('Automne');
    expect(screen.getAllByText('Consigne ·')).toHaveLength(1);
    expect(screen.getByText('15 septembre au 30 novembre')).toBeTruthy();
    expect(screen.queryByText('Aucune saison en ce moment.')).toBeNull();
  });

  it('one card per running season, in data order (December: Saint-Nicolas, then Christmas)', () => {
    vi.setSystemTime(new Date(2026, 11, 3, 12));
    renderSaisons(0);
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Saint-Nicolas', 'Noël & Nouvel An']);
    expect(screen.getAllByText('En ce moment')).toHaveLength(2);
    // The calendar still lists every season.
    expect(screen.getByRole('table', { name: 'Saisons' }).querySelectorAll('[role="rowheader"]')).toHaveLength(8);
  });

  describe('when no season runs this month', () => {
    const book = BOOK;
    const source = BOOK_SOURCE;
    beforeEach(() => setBook({ ...book, seasons: book.seasons.filter(x => !x.m.includes(10)) }, source));
    afterEach(() => setBook(book, source));

    it('says so instead of the cards (the calendar still lists the other seasons)', () => {
      renderSaisons(0);
      expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
      expect(screen.getByText('Aucune saison en ce moment.')).toBeTruthy();
      expect(screen.getByRole('table', { name: 'Saisons' }).querySelectorAll('[role="rowheader"]')).toHaveLength(7);
    });

    it('in NL', () => {
      renderSaisons(1);
      expect(screen.getByText('Geen seizoen op dit moment.')).toBeTruthy();
    });
  });

  it('renders in NL', () => {
    renderSaisons(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Seizoenen');
    const table = screen.getByRole('table', { name: 'Seizoenen' });
    expect(table.querySelector('[role="columnheader"]')?.textContent).toBe('Seizoenen');
    expect(table.querySelector('[aria-current="date"]')?.textContent).toBe('Okt');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Herfst']);
    expect(screen.getByText('Nu').previousElementSibling?.textContent).toBe('Herfst');
    expect(screen.getAllByText('Richtlijn ·')).toHaveLength(1);
  });

  it('a product pill opens the product sheet', () => {
    renderSaisons(0);
    fireEvent.click(screen.getByText('Brioche croustillante').closest('button')!);
    expect(state().sel).toBe('brioche');
  });
});
