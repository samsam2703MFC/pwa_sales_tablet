import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider, useApp, type AppState } from '../../state/store';
import { OnboardingView } from './OnboardingView';

/** Exposes the store state to the test, serialised in the DOM. */
function Probe() {
  return <output data-testid="state">{JSON.stringify(useApp().state)}</output>;
}
const state = (): AppState => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const renderOnb = (lang: Lang = 0, initial: Partial<AppState> = {}) =>
  render(
    <AppProvider initial={{ lang, view: 'onb', ...initial }}>
      <OnboardingView />
      <Probe />
    </AppProvider>,
  );

const h1 = () => screen.getByRole('heading', { level: 1 }).textContent;
const h2s = () => screen.queryAllByRole('heading', { level: 2 }).map(h => h.textContent);
const btn = (name: string | RegExp) => screen.getByRole('button', { name });
/** "✕ À éviter" / "✓ À dire" tags. */
const tags = (t: string) => [...document.querySelectorAll('span')].filter(e => e.textContent === t);

afterEach(cleanup);

describe('OnboardingView — list', () => {
  it('title, intro, 7 module buttons and the method line (FR)', () => {
    renderOnb(0);
    expect(h1()).toBe('Onboarding');
    expect(screen.getByText(/^Votre formation vente, module par module\./)).toBeTruthy();
    const mods = screen.getAllByRole('button');
    expect(mods).toHaveLength(7);
    expect(mods[0].textContent).toBe('Ouverture · 1 min de lectureVendre est un métierComprendre pourquoi votre travail au comptoir fait vivre la boutique→');
    expect(mods[6].textContent).toMatch(/^Module 6 · 1 min de lectureTéléphone et avis Google/);
    expect(screen.getByText(/^Méthode : /)).toBeTruthy();
    // decorative illustrations
    const imgs = document.querySelectorAll('img');
    expect(imgs).toHaveLength(7);
    expect([...imgs].every(i => i.getAttribute('alt') === '')).toBe(true);
    expect(imgs[2].getAttribute('src')).toMatch(/img\/onb\/hot-drink\.png$/);
  });

  it('NL labels', () => {
    renderOnb(1);
    expect(screen.getAllByRole('button')[1].textContent).toMatch(/^Module 1 · 1 min lezenDe klantervaring/);
    expect(screen.getByText(/^Methode/)).toBeTruthy();
  });

  it('a module button opens the module (short version)', () => {
    renderOnb(0);
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(state().onbMod).toBe(2);
    expect(state().onbFull).toBe(false);
    expect(h1()).toBe('Question ouverte, question fermée');
  });
});

describe('OnboardingView — module, short version', () => {
  it('header, rule, points, script with ✕/✓ rows, gain, links (FR)', () => {
    renderOnb(0, { onbMod: 1 });
    expect(screen.getByText('Module 1 · 30 min')).toBeTruthy();
    expect(h1()).toMatch(/^L'expérience client/);
    expect(screen.getByText('1 min de lecture')).toBeTruthy();
    expect(screen.getByText('La règle')).toBeTruthy();
    expect(screen.getByText(/^Le client oublie vite/)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('À dire à voix haute · Une cliente a acheté une grande tarte pour un anniversaire.')).toBeTruthy();
    expect(tags('✕ À éviter')).toHaveLength(1);
    expect(tags('✓ À dire')).toHaveLength(1);
    expect(screen.getByText('Ce que ça fait progresser : le retour des clients, et les avis 5★.')).toBeTruthy();
    // no exercise in the short version
    expect(screen.queryByText(/^En équipe, 15 min/)).toBeNull();
    // arrows are decorative (aria-hidden); prev / next names say where they go
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
      '← Tous les modules', 'Lire le module complet →', '← Ouverture', 'Module 2 →',
    ]);
    expect(btn('Tous les modules')).toBeTruthy();
    expect(btn('Lire le module complet')).toBeTruthy();
    expect(btn('Ouverture (précédent)')).toBeTruthy();
    expect(btn('Module 2 (suivant)')).toBeTruthy();
    // ✕ / ✓ tags: hidden from screen readers, which get the label without the glyph
    for (const t of [...tags('✕ À éviter'), ...tags('✓ À dire')]) {
      expect(t.getAttribute('aria-hidden')).toBe('true');
      expect(t.nextElementSibling!.className).toBe('sr-only');
    }
    expect(screen.getByText('À éviter:')).toBeTruthy();
    expect(screen.getByText('À dire:')).toBeTruthy();
  });

  it('script without ✕ line, and opening without script/gain', () => {
    renderOnb(0, { onbMod: 5 });
    expect(tags('✕ À éviter')).toHaveLength(0);
    expect(tags('✓ À dire')).toHaveLength(1);
    cleanup();
    renderOnb(0, { onbMod: 0 });
    expect(screen.queryByText(/^À dire à voix haute/)).toBeNull();
    expect(screen.queryByText(/^Ce que ça fait progresser/)).toBeNull();
    // first module: no previous
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
      '← Tous les modules', 'Lire le module complet →', 'Module 1 →',
    ]);
  });

  it('NL short version', () => {
    renderOnb(1, { onbMod: 1 });
    expect(screen.getByText('De regel')).toBeTruthy();
    expect(screen.getByText(/^Luidop te zeggen · /)).toBeTruthy();
    expect(tags('✕ Niet zo')).toHaveLength(1);
    expect(tags('✓ Wel zo')).toHaveLength(1);
    expect(btn('Volledige module lezen')).toBeTruthy();
    expect(btn('Alle modules')).toBeTruthy();
    expect(btn('Opening (vorige)')).toBeTruthy();
    expect(btn('Module 2 (volgende)')).toBeTruthy();
  });

  it('prev / next / back navigate', () => {
    renderOnb(0, { onbMod: 3, onbFull: true });
    fireEvent.click(btn('Module 4 (suivant)'));
    expect(state()).toMatchObject({ onbMod: 4, onbFull: false });
    fireEvent.click(btn('Module 3 (précédent)'));
    expect(state().onbMod).toBe(3);
    fireEvent.click(btn('Tous les modules'));
    expect(state().onbMod).toBe(-1);
    expect(h1()).toBe('Onboarding');
  });
});

describe('OnboardingView — module, full version', () => {
  it('toggles to the full livret text and back (FR)', () => {
    renderOnb(0, { onbMod: 1 });
    fireEvent.click(btn('Lire le module complet'));
    expect(state().onbFull).toBe(true);
    expect(screen.getByText('Version complète')).toBeTruthy();
    expect(screen.queryByText('La règle')).toBeNull();
    expect(h2s()).toEqual([
      'En entrant : « Je suis attendu, et j\'ai envie de tout goûter. »',
      'Pendant la vente : « On s\'occupe de moi, pas de la file. »',
      'En sortant : « J\'ai fait le bon choix, et je reviendrai. »',
      'Scripts à dire à voix haute',
      'Les pièges',
    ]);
    // exercise section and its content are removed
    expect(screen.queryByText(/^En équipe, 15 minutes\./)).toBeNull();
    // numbered list
    const ol = document.querySelector('ol')!;
    expect(within(ol).getAllByRole('listitem').map(li => li.firstChild!.textContent)).toEqual(['1', '2', '3']);
    // ✕ / ✓ rows inside the livret
    expect(tags('✕ À éviter')).toHaveLength(2);
    expect(tags('✓ À dire')).toHaveLength(3);
    fireEvent.click(btn('Revenir à la version courte'));
    expect(state().onbFull).toBe(false);
    expect(screen.getByText('La règle')).toBeTruthy();
  });

  it('tables: headers, cells and blanks to fill (module 5, NL)', () => {
    renderOnb(1, { onbMod: 5, onbFull: true });
    expect(screen.getByText('Volledige versie')).toBeTruthy();
    expect(h2s()).not.toContain('Oefening');
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    const sheet = tables[1];
    expect(within(sheet).getAllByRole('columnheader').map(c => c.textContent)).toEqual(['Product', 'Wat het anders maakt', 'Uw zin']);
    const rows = within(sheet).getAllByRole('row');
    expect(rows).toHaveLength(7);
    const cells = within(rows[3]).getAllByRole('cell');
    expect(cells.map(c => c.textContent)).toEqual(['Croissant', '', '']);
    expect(tables[1].style.gridTemplateColumns).toBe('repeat(3,minmax(140px,1fr))');
    expect(tables[1].style.minWidth).toBe('480px');
  });

  it('last module: no next', () => {
    renderOnb(0, { onbMod: 6, onbFull: true });
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
      '← Tous les modules', '← Revenir à la version courte', '← Module 5',
    ]);
  });
});

describe('OnboardingView — focus after a page change', () => {
  it('opening a module focuses its title; back to the list focuses the card we came from', () => {
    renderOnb(0);
    const card = screen.getAllByRole('button')[3];
    card.focus();
    fireEvent.click(card);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
    expect(h1()).toBe('Vente additionnelle');
    // full version, then next module: the title gets the focus each time
    fireEvent.click(btn('Lire le module complet'));
    expect(document.activeElement?.tagName).toBe('H1');
    btn('Module 4 (suivant)').focus();
    fireEvent.click(btn('Module 4 (suivant)'));
    expect(document.activeElement?.textContent).toBe('Vocabulaire positif, zéro négation');
    fireEvent.click(btn('Tous les modules'));
    expect(document.activeElement).toBe(screen.getAllByRole('button')[4]);
  });

  it('nothing is focused on mount, nor when the focus is outside the view', () => {
    render(
      <AppProvider initial={{ lang: 0, view: 'onb', onbMod: 2 }}>
        <button type="button">outside</button>
        <OnboardingView />
      </AppProvider>,
    );
    expect(document.activeElement).toBe(document.body);
    // the clicked link disappears (focus falls back to body) → the title takes it
    fireEvent.click(btn('Lire le module complet'));
    expect(document.activeElement?.tagName).toBe('H1');
    // focus elsewhere in the app (e.g. a sidebar item) is left alone
    const outside = btn('outside');
    outside.focus();
    fireEvent.click(btn('Revenir à la version courte'));
    expect(document.activeElement).toBe(outside);
  });
});
