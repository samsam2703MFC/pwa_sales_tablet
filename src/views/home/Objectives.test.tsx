import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOK, BOOK_SOURCE, SAMPLE_SOURCE, setBook } from '../../data/book';
import { OBJ_FRESH_MS, OBJ_STORE_KEY } from '../../data/objectives';
import type { BookSource, Lang } from '../../data/types';
import { AppProvider } from '../../state/store';
import { OBJECTIVES_PAYLOAD as P } from '../../test/objectivesFixture';
import { ObjectivesBlock } from './Objectives';

/** Where the block asks (src/lib/api.ts, jsdom's page at http://localhost:3000/, no shop). */
const URL_ = 'http://localhost:3000/api/cockpit/tablette/objectifs';
const BO: BookSource = { kind: 'bo', version: 'v1', generatedAt: '2026-10-02T09:12:00+02:00', shop: null };

/** Title of the cross-sell card (items per ticket since the 2 October 2026 contract). */
const CROSS_FR = 'Vente additionnelle · articles par ticket';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json(P));

const renderBlock = (lang: Lang = 0, source: BookSource = BO) => {
  setBook(BOOK, source);
  return render(
    <AppProvider initial={{ lang }}>
      <ObjectivesBlock />
    </AppProvider>,
  );
};

/** French and Dutch group digits with (narrow) no-break spaces or dots: compare with plain spaces. */
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

/** The rows of a card (title = its h2): period, value, status, and the gauge's bar and tick. */
const rows = (title: string) =>
  [...screen.getByRole('heading', { level: 2, name: title }).parentElement!.children].slice(1).map(r => {
    const [head, track, status] = [...r.children] as HTMLElement[];
    const fill = track.querySelector<HTMLElement>('div');
    const mark = track.querySelector<HTMLElement>('span');
    return {
      text: [head.children[0].textContent, norm(head.children[1].textContent), norm(status.textContent)],
      fill: fill ? parseFloat(fill.style.width) : null,
      good: !!fill?.className.includes('good'),
      mark: mark ? parseFloat(mark.style.left) : null,
    };
  });

const source = BOOK_SOURCE;
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockClear();
  fetchMock.mockImplementation(async () => json(P));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  setBook(BOOK, source);
  vi.unstubAllGlobals();
});

describe('ObjectivesBlock', () => {
  it('is hidden with the bundled sample data, and asks the BO nothing', () => {
    const { container } = renderBlock(0, SAMPLE_SOURCE);
    expect(container.textContent).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the BO targets: revenue and cross-sell, week and month, with gauges (FR)', async () => {
    renderBlock(0);
    expect(screen.getByText('Objectifs')).toBeTruthy();
    expect(await screen.findByText(/4 311 € \/ 6 000 €/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(URL_);

    const ca = rows("Chiffre d'affaires");
    expect(ca.map(r => r.text)).toEqual([
      ['Cette semaine', '4 311 € / 6 000 €', 'En avance · attendu à ce jour 3 420 €'],
      ['Ce mois', '812 € / 25 000 €', 'En retard · attendu à ce jour 1 650 €'],
    ]);
    // Bar = done / target; tick = expected by today / target; red when ahead, amber when behind.
    expect(ca[0].fill).toBeCloseTo((100 * 4310.5) / 6000);
    expect(ca[0].mark).toBe(57);
    expect(ca[0].good).toBe(true);
    expect(ca[1].fill).toBeCloseTo((100 * 812.4) / 25000);
    expect(ca[1].mark).toBeCloseTo(6.6);
    expect(ca[1].good).toBe(false);

    // Cross-sell: items per ticket against the shop's target.
    const cross = rows(CROSS_FR);
    expect(cross.map(r => r.text)).toEqual([
      ['Cette semaine', '1,82 / 2,00', 'À atteindre · 452 tickets'],
      ['Ce mois', '2,05 / 2,00', 'Atteint · 1 890 tickets'],
    ]);
    expect(cross[0].fill).toBeCloseTo(91);
    expect(cross.map(r => [r.mark, r.good])).toEqual([[null, false], [null, true]]);
    expect(cross[1].fill).toBe(100);
  });

  it('is translated (NL)', async () => {
    renderBlock(1);
    expect(screen.getByText('Doelen')).toBeTruthy();
    expect(await screen.findByText(/4\.311 € \/ 6\.000 €/)).toBeTruthy();
    expect(rows('Omzet').map(r => r.text)).toEqual([
      ['Deze week', '4.311 € / 6.000 €', 'Voor op schema · verwacht tot vandaag 3.420 €'],
      ['Deze maand', '812 € / 25.000 €', 'Achter op schema · verwacht tot vandaag 1.650 €'],
    ]);
    expect(rows('Bijverkoop · artikelen per ticket').map(r => r.text)).toEqual([
      ['Deze week', '1,82 / 2,00', 'Nog te gaan · 452 tickets'],
      ['Deze maand', '2,05 / 2,00', 'Gehaald · 1.890 tickets'],
    ]);
  });

  it('says what the BO does not know: no figure, no target, no expected value', async () => {
    const p = structuredClone(P);
    Object.assign(p.ca.semaine, { realise: 6100, objectif: 6000, attendu: null });
    Object.assign(p.ca.mois, { realise: 812.4, objectif: null, attendu: null });
    Object.assign(p.venteAdd.semaine, { parTicket: null, cible: 2, tickets: null });
    Object.assign(p.venteAdd.mois, { parTicket: 1.7, cible: null, tickets: 1890 });
    fetchMock.mockImplementation(async () => json(p));
    renderBlock(0);
    expect(await screen.findByText(/6 100 € \/ 6 000 €/)).toBeTruthy();
    expect(rows("Chiffre d'affaires").map(r => [r.text[1], r.text[2], r.fill, r.mark])).toEqual([
      ['6 100 € / 6 000 €', 'Atteint', 100, null],
      ['812 €', "Pas d'objectif", null, null],
    ]);
    expect(rows(CROSS_FR).map(r => [r.text[1], r.text[2], r.fill])).toEqual([
      ['— / 2,00', 'Pas encore de chiffres', null],
      ['1,70', "Pas d'objectif · 1 890 tickets", null],
    ]);
  });

  it('BO unreachable and nothing kept: empty gauges, "Pas encore de chiffres"', async () => {
    fetchMock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
    renderBlock(0);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise(r => setTimeout(r, 0));
    for (const title of ["Chiffre d'affaires", CROSS_FR]) {
      expect(rows(title).map(r => [r.text[1], r.text[2], r.fill])).toEqual([['—', 'Pas encore de chiffres', null], ['—', 'Pas encore de chiffres', null]]);
    }
  });

  it('shows the copy kept on the device at once; a recent one is not asked again', () => {
    localStorage.setItem(OBJ_STORE_KEY, JSON.stringify({ url: URL_, at: Date.now() - 60_000, payload: P }));
    renderBlock(0);
    expect(rows("Chiffre d'affaires")[0].text[1]).toBe('4 311 € / 6 000 €');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('an older kept copy shows at once, then the BO answer replaces it and is kept', async () => {
    localStorage.setItem(OBJ_STORE_KEY, JSON.stringify({ url: URL_, at: Date.now() - OBJ_FRESH_MS - 1000, payload: P }));
    const fresh = structuredClone(P);
    fresh.ca.semaine.realise = 5200;
    fetchMock.mockImplementation(async () => json(fresh));
    renderBlock(0);
    expect(rows("Chiffre d'affaires")[0].text[1]).toBe('4 311 € / 6 000 €');
    expect(await screen.findByText(/5 200 € \/ 6 000 €/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(OBJ_STORE_KEY)!)).toMatchObject({ url: URL_, payload: fresh });
  });

  it('a copy kept for another link (another shop) is not shown', async () => {
    localStorage.setItem(OBJ_STORE_KEY, JSON.stringify({ url: `${URL_}?shop=9`, at: Date.now(), payload: P }));
    fetchMock.mockImplementation(async () => { throw new TypeError('offline'); });
    renderBlock(0);
    expect(rows("Chiffre d'affaires")[0].text[1]).toBe('—');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
