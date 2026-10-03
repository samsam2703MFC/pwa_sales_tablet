import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp } from '../../state/store';
import { BasesView } from './BasesView';

/** Switches the app language from inside the provider (stands for the FR / NL toggle). */
function ToNl() {
  const { actions } = useApp();
  return <button type="button" onClick={() => actions.setLang(1)}>to-nl</button>;
}

const renderBases = (lang: Lang = 0) =>
  render(
    <AppProvider initial={{ lang, view: 'bases' }}>
      <BasesView />
      <ToNl />
    </AppProvider>,
  );

const chips = () => within(screen.getByRole('group')).getAllByRole('button');
const pressed = () => chips().filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent);
const h2 = () => screen.getByRole('heading', { level: 2 }).textContent;
const h3s = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
const steps = () => within(document.querySelector('ol')!).getAllByRole('listitem');
/** "✓ À dire" / "✕ À éviter" tags. */
const tags = (t: string) => [...document.querySelectorAll('span')].filter(e => e.textContent === t);

afterEach(cleanup);

describe('BasesView', () => {
  it('title, intro, one chip per topic, the first topic open (FR)', () => {
    renderBases(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Les bases');
    expect(screen.getByText(/^Les gestes et les mots de chaque jour au comptoir/)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Thèmes' })).toBeTruthy();
    expect(chips().map(c => c.textContent)).toEqual([
      'Bonjour', 'Téléphone', 'Client mécontent', "File d'attente", 'Fidélité', 'Au revoir',
    ]);
    expect(pressed()).toEqual(['Bonjour']);

    // the topic card: heading order h1 → h2 → h3
    const card = screen.getByRole('article', { name: 'Accueillir un client' });
    expect(h2()).toBe('Accueillir un client');
    expect(h3s()).toEqual(['Étape par étape', "Ce qu'on dit", "Ce qu'on ne dit pas"]);
    expect(within(card).getByText('La règle')).toBeTruthy();
    expect(within(card).getByText(/^Chaque client qui entre est regardé et salué dans les 3 secondes/)).toBeTruthy();
    expect(steps().map(li => li.firstChild!.textContent)).toEqual(['1', '2', '3', '4']);
    expect(tags('✓ À dire')).toHaveLength(2);
    expect(tags('✕ À éviter')).toHaveLength(2);
    expect(screen.getByText('« Bonjour ! Qu\'est-ce qui vous ferait plaisir ? »')).toBeTruthy();
    expect(screen.getByText('« Je vous écoute. »')).toBeTruthy();
    expect(screen.getByText("Livret de formation · Module 1 · L'expérience client")).toBeTruthy();

    // decorative illustration; glyph tags hidden from screen readers, which get the label
    const img = card.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('src')).toMatch(/img\/onb\/croissant\.png$/);
    for (const t of [...tags('✓ À dire'), ...tags('✕ À éviter')]) {
      expect(t.getAttribute('aria-hidden')).toBe('true');
      expect(t.nextElementSibling!.className).toBe('sr-only');
    }
  });

  it('a chip shows its topic', () => {
    renderBases(0);
    fireEvent.click(screen.getByRole('button', { name: 'Téléphone' }));
    expect(pressed()).toEqual(['Téléphone']);
    expect(h2()).toBe('Répondre au téléphone');
    expect(steps()).toHaveLength(5);
    expect(tags('✓ À dire')).toHaveLength(3);
    expect(tags('✕ À éviter')).toHaveLength(3);
    expect(screen.getByText(/^« L'Atelier By \[boutique\], bonjour, \[prénom\] à l'appareil\./)).toBeTruthy();
    expect(document.querySelector('img')!.getAttribute('src')).toMatch(/phone-orders\.png$/);
    // the arrows of a ✕ mini-dialogue are decorative
    const dialogue = screen.getByText(/^« Oui, on en a\. »/);
    const arrows = [...dialogue.querySelectorAll('span')];
    expect(arrows.map(a => [a.textContent, a.getAttribute('aria-hidden')])).toEqual([['→', 'true']]);
    // no-break spaces keep the French punctuation and the quotes with their words
    expect(screen.getByText(/^« L'Atelier By/).textContent).toContain('plaisir\u00a0?\u00a0»');

    fireEvent.click(screen.getByRole('button', { name: 'Fidélité' }));
    expect(h2()).toBe('Fidéliser un client');
    expect(screen.getByText(/1 point par euro, 100 points = 5 € offerts/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Au revoir' }));
    expect(pressed()).toEqual(['Au revoir']);
    expect(h2()).toBe('Dire au revoir');
  });

  it('NL labels and texts', () => {
    renderBases(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('De basis');
    expect(screen.getByRole('group', { name: "Thema's" })).toBeTruthy();
    expect(chips().map(c => c.textContent)).toEqual([
      'Goeiedag', 'Telefoon', 'Ontevreden klant', 'Wachtrij', 'Getrouwheid', 'Tot ziens',
    ]);
    expect(h2()).toBe('Een klant onthalen');
    expect(h3s()).toEqual(['Stap voor stap', 'Wat we zeggen', 'Wat we niet zeggen']);
    expect(screen.getByText('De regel')).toBeTruthy();
    expect(tags('✓ Wel zo')).toHaveLength(2);
    expect(tags('✕ Niet zo')).toHaveLength(2);
    expect(screen.getByText('Opleidingsboekje · Module 1 · De klantervaring')).toBeTruthy();
  });

  it('switching the language keeps the chosen topic and translates everything', () => {
    renderBases(0);
    fireEvent.click(screen.getByRole('button', { name: 'Client mécontent' }));
    expect(h2()).toBe('Gérer un client mécontent');
    fireEvent.click(screen.getByRole('button', { name: 'to-nl' }));
    expect(pressed()).toEqual(['Ontevreden klant']);
    expect(h2()).toBe('Omgaan met een ontevreden klant');
    expect(screen.getByText('« Bedankt dat u het zegt, en onze excuses daarvoor. »')).toBeTruthy();
    expect(screen.queryByText(/Gérer|Ce qu'on dit/)).toBeNull();
  });
});
