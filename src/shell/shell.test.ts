import { describe, expect, it } from 'vitest';
import { isNavActive, isTabActive, moreGroups, navGroups, tabLabel } from './shell.logic';

describe('isNavActive', () => {
  it('is active on its own view without search text', () => {
    expect(isNavActive('gamme', 'gamme', '')).toBe(true);
    expect(isNavActive('home', 'gamme', '')).toBe(false);
  });

  it('is never active while there is search text (even only spaces, as in the prototype)', () => {
    expect(isNavActive('gamme', 'gamme', 'noix')).toBe(false);
    expect(isNavActive('gamme', 'gamme', ' ')).toBe(false);
  });
});

describe('navGroups', () => {
  it('builds the FR groups in sidebar order', () => {
    const g = navGroups(0);
    expect(g.map(x => x.title)).toEqual(['Vente', 'Formation']);
    expect(g[0].items.map(i => i.label)).toEqual([
      'Accueil', 'La gamme', 'Saisons', 'Allergènes', 'Vendre plus', 'FAQ clients', 'Services', 'Conservation', 'Statistiques',
    ]);
    expect(g[1].items).toEqual([{ id: 'onb', label: 'Onboarding' }]);
  });

  it('builds the NL groups', () => {
    const g = navGroups(1);
    expect(g.map(x => x.title)).toEqual(['Verkoop', 'Opleiding']);
    expect(g[0].items[0]).toEqual({ id: 'home', label: 'Start' });
    expect(g[0].items[5]).toEqual({ id: 'faq', label: 'FAQ klanten' });
  });
});

describe('isTabActive', () => {
  it('highlights the tab of the current view when the sheet is closed', () => {
    expect(isTabActive('home', 'home', false)).toBe(true);
    expect(isTabActive('gamme', 'home', false)).toBe(false);
    expect(isTabActive('more', 'home', false)).toBe(false);
  });

  it('highlights only "Plus" while the sheet is open', () => {
    expect(isTabActive('home', 'home', true)).toBe(false);
    expect(isTabActive('more', 'home', true)).toBe(true);
  });

  it('highlights "Plus" for views without their own tab', () => {
    for (const v of ['saisons', 'ventes', 'svc', 'cons', 'stats', 'onb'] as const) {
      expect(isTabActive('more', v, false)).toBe(true);
      expect(isTabActive('home', v, false)).toBe(false);
    }
  });
});

describe('tabLabel', () => {
  it('uses section names, literal "FAQ" and Plus/Meer', () => {
    expect(['home', 'gamme', 'al', 'faq', 'more'].map(id => tabLabel(id as never, 0)))
      .toEqual(['Accueil', 'La gamme', 'Allergènes', 'FAQ', 'Plus']);
    expect(['home', 'gamme', 'al', 'faq', 'more'].map(id => tabLabel(id as never, 1)))
      .toEqual(['Start', 'Assortiment', 'Allergenen', 'FAQ', 'Meer']);
  });
});

describe('moreGroups', () => {
  it('lists the sections without a tab, with their images', () => {
    const fr = moreGroups(0);
    expect(fr.map(g => g.title)).toEqual(['Vente', 'Formation']);
    expect(fr[0].items.map(i => i.id)).toEqual(['saisons', 'ventes', 'svc', 'cons', 'stats']);
    expect(fr[0].items[0]).toEqual({ id: 'saisons', label: 'Saisons', img: 'img/s/autumn-range.png' });
    expect(fr[1].items).toEqual([{ id: 'onb', label: 'Onboarding', img: 'img/onb/croissant.png' }]);
  });

  it('translates labels to NL', () => {
    const nl = moreGroups(1);
    expect(nl.map(g => g.title)).toEqual(['Verkoop', 'Opleiding']);
    expect(nl[0].items.map(i => i.label)).toEqual(['Seizoenen', 'Meer verkopen', 'Diensten', 'Bewaring', 'Statistieken']);
  });
});
