import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { FaqView } from './FaqView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderFaq = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, view: 'faq', ...initial }}>
      <FaqView />
      <Probe />
    </AppProvider>,
  );

const chips = () => within(screen.getAllByRole('group')[0]).getAllByRole('button');
const subChips = () => within(screen.getByRole('group', { name: 'Produits' })).getAllByRole('button');
/** Accordion header buttons (inside the H2s). */
const questions = () => screen.getAllByRole('heading', { level: 2 }).map(h => within(h).getByRole('button'));
const expanded = () => questions().map(b => b.getAttribute('aria-expanded'));
const q = (name: string) => screen.getByRole('button', { name });
/** The answer panel controlled by a header button. */
const panelOf = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-controls')!)!;

afterEach(cleanup);

describe('FaqView', () => {
  it('renders title, chips and every question; the first one starts open (FR)', () => {
    renderFaq(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Questions fréquentes');
    expect(chips().map(b => b.textContent)).toEqual(['Tout', 'Allergies & régimes', 'Produits', 'Commandes', 'Services & paiement']);
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('group')).toHaveLength(1); // no second row under "Tout"
    expect(questions()).toHaveLength(31);
    expect(expanded()).toEqual(['true', ...Array(30).fill('false')]);
    // the "+/−" sign is decorative: the accessible name is the question only
    expect(questions()[0].textContent).toBe('Avez-vous des produits sans gluten ?−');
    expect(q('Avez-vous des produits sans gluten ?')).toBe(questions()[0]);
  });

  it('renders in NL', () => {
    renderFaq(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Veelgestelde vragen');
    expect(chips()[0].textContent).toBe('Alles');
    const head = q('Hebben jullie glutenvrije producten?');
    expect(head.getAttribute('aria-expanded')).toBe('true');
    expect(within(panelOf(head)).getByText('Betrokken producten')).toBeTruthy();
  });

  it('the open answer is controlled by its header, with the linked products', () => {
    renderFaq(0);
    const head = questions()[0];
    const panel = panelOf(head);
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Non, tous nos produits sont fabriqués');
    expect(within(panel).getByText('Produits concernés')).toBeTruthy();
    expect(within(panel).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Salade quinoa & légumes rôtis', 'Limonade maison', "Jus d'orange pressé",
    ]);
    expect(questions().slice(1).every(b => panelOf(b).hidden)).toBe(true);
  });

  it('toggles: one answer open at a time, a second tap closes it', () => {
    renderFaq(0);
    fireEvent.click(q('Quels produits sont vegan ?'));
    expect(state().faqOpen).toBe(2);
    expect(expanded()).toEqual(['false', 'false', 'true', ...Array(28).fill('false')]);
    fireEvent.click(q('Quels produits sont vegan ?'));
    expect(state().faqOpen).toBe(-1);
    expect(expanded().every(e => e === 'false')).toBe(true);
  });

  it('a question without linked products has no "Produits concernés"', () => {
    renderFaq(0);
    const head = q('Livrez-vous à domicile ?');
    fireEvent.click(head);
    expect(panelOf(head).hidden).toBe(false);
    expect(panelOf(head).textContent).toBe('Nous livrons uniquement les bureaux et entreprises (minimum 50 €). Pour les particuliers, proposer le click & collect.');
    expect(within(panelOf(head)).queryByText('Produits concernés')).toBeNull();
  });

  it('a chip filters the questions and closes the open answer', () => {
    renderFaq(0);
    fireEvent.click(screen.getByRole('button', { name: 'Commandes' }));
    expect(state()).toMatchObject({ faqCat: 'cmd', faqOpen: -1 });
    expect(screen.getByRole('button', { name: 'Commandes' }).getAttribute('aria-pressed')).toBe('true');
    expect(questions().map(b => b.firstChild?.textContent)).toEqual([
      "Peut-on commander un gâteau d'anniversaire ?",
      "Jusqu'à quand peut-on commander pour Noël ?",
      'Peut-on annuler une commande ?',
    ]);
    expect(expanded()).toEqual(['false', 'false', 'false']);
    fireEvent.click(q('Peut-on annuler une commande ?'));
    expect(state().faqOpen).toBe(27);
    fireEvent.click(screen.getByRole('button', { name: 'Tout' }));
    expect(questions()).toHaveLength(31);
    expect(state().faqOpen).toBe(-1);
  });

  it('"Produits" shows the product families as a second row, which filters its questions', () => {
    renderFaq(0);
    fireEvent.click(screen.getByRole('button', { name: 'Produits' }));
    expect(subChips().map(b => b.textContent)).toEqual([
      'Tout', 'Viennoiserie', 'Boulangerie', 'Pâtisserie', 'Tartes', 'Quiches', 'Traiteur', 'Biscuiterie', 'Épicerie', 'Fêtes & Occasions',
    ]);
    expect(subChips()[0].getAttribute('aria-pressed')).toBe('true');
    expect(questions()).toHaveLength(22);
    fireEvent.click(q('Pouvez-vous trancher le pain ?'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Produits' })).getByRole('button', { name: 'Tartes' }));
    expect(state()).toMatchObject({ faqCat: 'prod', faqSub: 'tartes', faqOpen: -1 });
    expect(subChips()[4].getAttribute('aria-pressed')).toBe('true');
    expect(questions().map(b => b.firstChild?.textContent)).toEqual([
      'Peut-on acheter une tarte en morceaux ?',
      'Peut-on commander une tarte entière ?',
    ]);
    // another category: the second row goes, and coming back starts on its "Tout"
    fireEvent.click(screen.getByRole('button', { name: 'Commandes' }));
    expect(screen.getAllByRole('group')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Produits' }));
    expect(state().faqSub).toBe('all');
    expect(questions()).toHaveLength(22);
  });

  it('the families in NL', () => {
    renderFaq(1, { faqCat: 'prod' });
    const row = screen.getByRole('group', { name: 'Producten' });
    expect(within(row).getAllByRole('button').map(b => b.textContent).slice(0, 4)).toEqual(['Alles', 'Viennoiserie', 'Brood', 'Gebak']);
    fireEvent.click(within(row).getByRole('button', { name: 'Brood' }));
    expect(questions()[2].firstChild?.textContent).toBe('Hoe bewaar ik het brood?');
  });

  it('a linked product pill opens the product sheet', () => {
    renderFaq(0);
    fireEvent.click(screen.getByRole('button', { name: 'Limonade maison' }));
    expect(state().sel).toBe('limonade');
  });
});
