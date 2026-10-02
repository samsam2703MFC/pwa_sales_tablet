import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REMARK_QUEUE_KEY, type Remark } from '../../data/remarks';
import type { Lang } from '../../data/types';
import { AppProvider } from '../../state/store';
import { RemarkForm } from './RemarkForm';

/** Where the form posts (src/lib/api.ts, jsdom's page at http://localhost:3000/). */
const URL_ = 'http://localhost:3000/api/cockpit/tablette/remarques';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const status = (code: number) => new Response(JSON.stringify(code < 300 ? { ok: true } : { erreur: 'x' }), { status: code, headers: { 'content-type': 'application/json' } });
const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => status(201));
/** The remarks the BO received. */
const posted = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as Remark);
const queue = (): Remark[] => JSON.parse(localStorage.getItem(REMARK_QUEUE_KEY) ?? '[]');

const renderForm = (lang: Lang = 0) =>
  render(
    <AppProvider initial={{ lang }}>
      <RemarkForm />
    </AppProvider>,
  );

const form = () => screen.getByRole('form');
const textbox = () => within(form()).getByRole('textbox');
const send = () => within(form()).getByRole('button', { name: /^(Envoyer|Versturen|Envoi…|Versturen…)$/ });
const chip = (name: string) => within(form()).getByRole('button', { name });
const message = () => within(form()).getByRole('status');

/** Lets pending promise callbacks run (the send, a background send of waiting remarks). */
const settle = () => act(() => new Promise<void>(r => setTimeout(r, 0)));

/** Fills the form like the staff does and sends it. */
async function submit(type: string, text: string) {
  fireEvent.click(chip(type));
  fireEvent.change(textbox(), { target: { value: text } });
  fireEvent.click(send());
  await settle();
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => status(201));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(async () => {
  await settle();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RemarkForm', () => {
  it('renders the title, the three types, the text field and a disabled "Envoyer" (FR)', () => {
    renderForm(0);
    expect(screen.getByRole('form', { name: "Remarque d'un client" })).toBeTruthy();
    expect(screen.getByText('Ce que le client a dit, avec ses mots. Elle part au back-office.')).toBeTruthy();
    const types = within(form()).getByRole('group', { name: 'Choisissez le type de remarque.' });
    expect(within(types).getAllByRole('button').map(b => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['Compliment', 'false'], ['Suggestion', 'false'], ['Réclamation', 'false'],
    ]);
    expect(textbox().getAttribute('maxlength')).toBe('1000');
    expect(within(form()).getByText('0 / 1000')).toBeTruthy();
    expect(send().textContent).toBe('Envoyer');
    expect((send() as HTMLButtonElement).disabled).toBe(true);
    expect(message().textContent).toBe('');
  });

  it('"Envoyer" waits for a type and a text (spaces alone are not a text)', () => {
    renderForm(0);
    fireEvent.change(textbox(), { target: { value: 'Très bon accueil.' } });
    expect(within(form()).getByText('17 / 1000')).toBeTruthy();
    expect((send() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(chip('Compliment'));
    expect(chip('Compliment').getAttribute('aria-pressed')).toBe('true');
    expect((send() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(textbox(), { target: { value: '   ' } });
    expect((send() as HTMLButtonElement).disabled).toBe(true);
    // One type at a time.
    fireEvent.click(chip('Réclamation'));
    expect(within(form()).getAllByRole('button', { pressed: true }).map(b => b.textContent)).toEqual(['Réclamation']);
    // Without a type, a submit (Enter) sends nothing.
    fireEvent.submit(form());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the remark to the BO and thanks; the form is cleared', async () => {
    renderForm(0);
    await submit('Suggestion', '  Des pistolets aux graines le dimanche.  ');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(URL_);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    const [r] = posted();
    expect(r).toEqual({ id: expect.stringMatching(UUID_V4), shop: null, type: 'suggestion', texte: 'Des pistolets aux graines le dimanche.', langue: 'fr', saisieLe: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/) });
    expect(message().textContent).toBe('Merci ! La remarque est envoyée.');
    expect((textbox() as HTMLTextAreaElement).value).toBe('');
    expect(within(form()).queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(queue()).toEqual([]);
  });

  it('says "Envoi…" while sending, and cannot be sent twice', async () => {
    let answer!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>(resolve => { answer = resolve; }));
    renderForm(0);
    fireEvent.click(chip('Compliment'));
    fireEvent.change(textbox(), { target: { value: 'Merci pour le gâteau.' } });
    fireEvent.click(send());
    expect(send().textContent).toBe('Envoi…');
    expect((send() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(send()); // a second tap
    await act(async () => answer(status(201)));
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(message().textContent).toBe('Merci ! La remarque est envoyée.');
  });

  it('offline: kept on the tablet and said so; then counted as waiting', async () => {
    fetchMock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
    renderForm(0);
    await submit('Réclamation', 'Le croissant était rassis.');
    expect(message().textContent).toBe('Gardée sur la tablette : elle partira dès que la connexion revient.');
    expect(queue()).toEqual([expect.objectContaining({ type: 'reclamation', texte: 'Le croissant était rassis.', langue: 'fr' })]);
    expect((textbox() as HTMLTextAreaElement).value).toBe('');
    // Typing the next remark replaces the message with the waiting count.
    fireEvent.change(textbox(), { target: { value: 'A' } });
    expect(message().textContent).toBe("1 remarque en attente d'envoi.");
  });

  it('BO down (5xx) or too many remarks today (429): kept on the tablet too', async () => {
    for (const code of [503, 429]) {
      fetchMock.mockImplementation(async () => status(code));
      renderForm(0);
      await submit('Compliment', `Code ${code}`);
      expect(message().textContent).toMatch(/^Gardée sur la tablette/);
      cleanup();
    }
    expect(queue().map(r => r.texte)).toEqual(['Code 503', 'Code 429']);
  });

  it('refused by the BO (400): an error, the text stays to be corrected', async () => {
    fetchMock.mockImplementation(async () => status(400));
    renderForm(0);
    await submit('Suggestion', 'Texte refusé');
    expect(message().textContent).toBe('Le back-office a refusé cette remarque : vérifiez le texte.');
    expect(message().className).toContain('err');
    expect((textbox() as HTMLTextAreaElement).value).toBe('Texte refusé');
    expect(chip('Suggestion').getAttribute('aria-pressed')).toBe('true');
    expect(queue()).toEqual([]);
  });

  it('neither sent nor kept (offline, storage blocked): says it is lost, the text stays', async () => {
    fetchMock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    renderForm(0);
    await submit('Compliment', 'Très bon.');
    expect(message().textContent).toBe("La remarque n'a pas pu être envoyée ni gardée : réessayez.");
    expect(message().className).toContain('err');
    expect((textbox() as HTMLTextAreaElement).value).toBe('Très bon.');
  });

  it('shows how many remarks are waiting on the tablet', () => {
    const r = (id: string): Remark => ({ id, shop: null, type: 'compliment', texte: 'x', langue: 'fr', saisieLe: '2026-10-02T10:00:00+02:00' });
    localStorage.setItem(REMARK_QUEUE_KEY, JSON.stringify([r('a'), r('b')]));
    renderForm(0);
    expect(message().textContent).toBe("2 remarques en attente d'envoi.");
    cleanup();
    localStorage.setItem(REMARK_QUEUE_KEY, JSON.stringify([r('a')]));
    renderForm(1);
    expect(message().textContent).toBe('1 opmerking wacht om verstuurd te worden.');
  });

  it('once a remark is sent, the waiting ones leave too and the count follows', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const waiting: Remark = { id: 'w1', shop: null, type: 'suggestion', texte: 'En attente', langue: 'fr', saisieLe: '2026-10-02T10:00:00+02:00' };
      localStorage.setItem(REMARK_QUEUE_KEY, JSON.stringify([waiting]));
      renderForm(0);
      expect(message().textContent).toBe("1 remarque en attente d'envoi.");
      await submit('Compliment', 'Nouvelle');
      await settle();
      expect(posted().map(r => r.texte)).toEqual(['Nouvelle', 'En attente']);
      expect(queue()).toEqual([]);
      // After the thanks, the count is refreshed every few seconds.
      fireEvent.change(textbox(), { target: { value: 'B' } });
      act(() => vi.advanceTimersByTime(5000));
      expect(message().textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('is translated (NL), and tells the BO the remark was typed in Dutch', async () => {
    renderForm(1);
    expect(screen.getByRole('form', { name: 'Opmerking van een klant' })).toBeTruthy();
    expect(within(form()).getAllByRole('button').map(b => b.textContent)).toEqual(['Compliment', 'Suggestie', 'Klacht', 'Versturen']);
    await submit('Klacht', 'Te lang gewacht.');
    expect(posted()[0]).toMatchObject({ type: 'reclamation', texte: 'Te lang gewacht.', langue: 'nl' });
    expect(message().textContent).toBe('Bedankt! De opmerking is verstuurd.');
  });
});
