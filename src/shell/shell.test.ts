import { describe, expect, it } from 'vitest';
import { SAMPLE_SOURCE } from '../data/book';
import { NAV } from '../lib/i18n';
import { isTabActive, moreGroups, sourceDate, sourceLabel, TAB_IDS, tabLabel } from './shell.logic';

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
    for (const v of ['saisons', 'ventes', 'svc', 'cons', 'stats', 'obj', 'rem', 'bases', 'onb'] as const) {
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
  it('lists the sections without a tab, with their images ("Les bases" before "Onboarding")', () => {
    const fr = moreGroups(0);
    expect(fr.map(g => g.title)).toEqual(['Vente', 'Formation']);
    expect(fr[0].items.map(i => i.id)).toEqual(['saisons', 'ventes', 'svc', 'cons', 'stats', 'obj', 'rem']);
    // the targets and the customer remarks left the home page for their own sections
    expect(fr[0].items.slice(5)).toEqual([
      { id: 'obj', label: 'Objectifs', img: 'img/objectifs.svg' },
      { id: 'rem', label: 'Remarques clients', img: 'img/s/valentines-day-range.png' },
    ]);
    expect(fr[0].items[0]).toEqual({ id: 'saisons', label: 'Saisons', img: 'img/s/autumn-range.png' });
    expect(fr[1].items).toEqual([
      { id: 'bases', label: 'Les bases', img: 'img/onb/phone-orders.png' },
      { id: 'onb', label: 'Onboarding', img: 'img/onb/croissant.png' },
    ]);
  });

  it('translates labels to NL', () => {
    const nl = moreGroups(1);
    expect(nl.map(g => g.title)).toEqual(['Verkoop', 'Opleiding']);
    expect(nl[0].items.map(i => i.label)).toEqual(['Seizoenen', 'Meer verkopen', 'Diensten', 'Bewaring', 'Statistieken', 'Doelen', 'Klantenopmerkingen']);
    expect(nl[1].items.map(i => i.label)).toEqual(['De basis', 'Onboarding']);
  });

  it('together with the tabs, reaches every section exactly once', () => {
    const inSheet = moreGroups(0).flatMap(g => g.items.map(i => i.id));
    const all = [...TAB_IDS, ...inSheet];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(NAV.map(([id]) => id).sort());
  });
});

describe('sourceLabel — data-source indicator', () => {
  const bo = { kind: 'bo', version: 'v1', generatedAt: '2026-10-02T09:12:00+02:00', shop: { id: '4', name: 'Ixelles' } } as const;

  it("sample: a short label (top bar pill), or the prototype's long sentence", () => {
    expect(sourceLabel(SAMPLE_SOURCE, 0, true)).toBe("Données d'exemple — à remplacer par les fiches produit officielles.");
    expect(sourceLabel(SAMPLE_SOURCE, 0)).toBe("Données d'exemple");
    expect(sourceLabel(SAMPLE_SOURCE, 1)).toBe('Voorbeeldgegevens');
  });

  it('BO: shop and generation time (device time zone)', () => {
    const when = sourceDate(bo.generatedAt, 0);
    expect(when).toMatch(/^2 oct\.? \d\d[:h.]\d\d$/);
    expect(sourceLabel(bo, 0)).toBe(`BO · Ixelles · ${when}`);
    expect(sourceLabel(bo, 0, true)).toBe(`BO · Ixelles · ${when}`);
    expect(sourceLabel({ ...bo, shop: null }, 1)).toBe(`BO · netwerk · ${sourceDate(bo.generatedAt, 1)}`);
    expect(sourceLabel({ ...bo, generatedAt: null }, 0)).toBe('BO · Ixelles');
  });

  it('offline: the cached book and its date', () => {
    expect(sourceLabel({ ...bo, kind: 'cache' }, 0)).toBe(`Hors ligne · données du ${sourceDate(bo.generatedAt, 0)}`);
    expect(sourceLabel({ ...bo, kind: 'cache' }, 1)).toBe(`Offline · gegevens van ${sourceDate(bo.generatedAt, 1)}`);
    expect(sourceLabel({ ...bo, kind: 'cache', generatedAt: 'garbage' }, 0)).toBe('Hors ligne');
  });
});
