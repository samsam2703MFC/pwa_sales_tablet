import { describe, expect, it } from 'vitest';
import { BUNDLE_SHOPS, BUNDLES, type BundlePlan } from '../../data/bundles';
import { bundleWeek, whenLabel, type BundleWeekVM } from './bundles.logic';

const PLAN: BundlePlan = {
  from: '2026-10-15',
  to: '2026-12-15',
  bundles: [
    { id: 'a', name: ['Matin', 'Ochtend'], content: ['1 + 1', '1 + 1'], price: 3.5, channel: 'shop', section: 'matin', days: { 1: ['avant 11 h', 'voor 11 u'], 7: ['toute la journée', 'de hele dag'] } },
    { id: 'b', name: ['Site', 'Webshop'], content: ['−20 %', '−20 %'], price: null, offer: ['−20 %', '−20 %'], channel: 'cc', section: 'jour', days: { 3: ['−20 %', '−20 %'] } },
    {
      id: 'c', name: ['Duo', 'Duo'], content: ['1 quiche + ¼ de tarte', '1 quiche + ¼ taart'], price: 19.9, channel: 'shop', section: 'weekend',
      days: { 6: ['toute la journée', 'de hele dag'] }, shops: ['3', '4'], shopContent: { 4: ['½ quiche + ½ tarte', '½ quiche + ½ taart'] },
    },
  ],
};
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
/** The week, no-break spaces read as spaces. */
const week = (d: Date, shop: string | null = null, lang: 0 | 1 = 0) => JSON.parse(JSON.stringify(bundleWeek(d, shop, lang, PLAN)).replace(/\u00a0/g, ' ')) as BundleWeekVM;

describe('bundleWeek', () => {
  it('before the period: the weekly pattern without dates, and when it starts', () => {
    const w = week(at(2026, 10, 2));
    expect([w.upcoming, w.start, w.period]).toEqual([true, 'Dès le jeudi 15 octobre', 'Du 15 octobre au 15 décembre']);
    expect(w.days.map(d => [d.label, d.date, d.today])).toEqual([
      ['Lun', '', false], ['Mar', '', false], ['Mer', '', false], ['Jeu', '', false], ['Ven', '', false], ['Sam', '', false], ['Dim', '', false],
    ]);
    expect(w.rows.map(r => r.cells)).toEqual([
      ['avant 11 h', '', '', '', '', '', 'toute la journée'],
      ['', '', '−20 %', '', '', '', ''],
      ['', '', '', '', '', 'toute la journée', ''],
    ]);
  });

  it('price, discount, channel; not tied to a shop → every bundle, with where it runs', () => {
    const [a, b, c] = week(at(2026, 10, 20)).rows;
    expect([a.price, a.channel, a.note]).toEqual(['3,50 €', '', '']);
    expect([b.price, b.channel]).toEqual(['−20 %', 'Click & collect']);
    expect([c.content, c.note]).toEqual(['1 quiche + ¼ de tarte', 'Seulement à Gosselies, Halle · Halle : ½ quiche + ½ tarte']);
  });

  it('in a shop: only its bundles, with its own content', () => {
    expect(week(at(2026, 10, 20), '2').rows.map(r => r.id)).toEqual(['a', 'b']);
    const c = week(at(2026, 10, 20), '4').rows[2];
    expect([c.content, c.note]).toEqual(['½ quiche + ½ tarte', '']);
    expect(week(at(2026, 10, 20), '3').rows[2].content).toBe('1 quiche + ¼ de tarte');
  });

  it('the week of the start: dates, today, days before the period left empty', () => {
    const w = week(at(2026, 10, 16));
    expect([w.upcoming, w.start]).toEqual([false, '']);
    expect(w.days.map(d => d.date)).toEqual(['12', '13', '14', '15', '16', '17', '18']);
    expect(w.days.map(d => d.today)).toEqual([false, false, false, false, true, false, false]);
    expect(w.rows.map(r => r.id)).toEqual(['a', 'c']); // Monday and Wednesday are before the period: "b" does not run this week
    expect(w.rows[0].cells).toEqual(['', '', '', '', '', '', 'toute la journée']);
  });

  it('the week of the start, before it starts (Tuesday 13): dates, and when it starts', () => {
    const w = week(at(2026, 10, 13));
    expect([w.upcoming, w.start]).toEqual([false, 'Dès le jeudi 15 octobre']);
  });

  it('the last week: days after the period left empty; after the period, nothing', () => {
    const w = week(at(2026, 12, 14));
    expect(w.days.map(d => d.date)).toEqual(['14', '15', '16', '17', '18', '19', '20']);
    expect(w.rows.map(r => r.id)).toEqual(['a']);
    expect(w.rows[0].cells).toEqual(['avant 11 h', '', '', '', '', '', '']);
    expect(bundleWeek(at(2026, 12, 16), null, 0, PLAN)).toBeNull();
  });

  it('a week across months and years keeps Monday → Sunday (Sunday 1 November)', () => {
    expect(week(at(2026, 11, 1)).days.map(d => d.date)).toEqual(['26', '27', '28', '29', '30', '31', '1']);
  });

  it('NL', () => {
    const w = week(at(2026, 10, 2), null, 1);
    expect([w.start, w.period]).toEqual(['Vanaf donderdag 15 oktober', 'Van 15 oktober tot 15 december']);
    expect(w.days.map(d => d.label)).toEqual(['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']);
    expect(w.rows[2].note).toBe('Alleen in Gosselies, Halle · Halle: ½ quiche + ½ taart');
  });
});

describe('whenLabel', () => {
  const t = (cells: string[], lang: 0 | 1 = 0) => whenLabel(cells, lang);
  it('groups consecutive days with the same slot', () => {
    expect(t(['a', 'a', 'a', 'a', 'a', '', ''])).toBe('Lun → ven · a');
    expect(t(['a', 'a', 'a', 'a', 'a', 'a', 'a'])).toBe('Tous les jours · a');
    expect(t(['', '', '', '', '', 'b', 'b'])).toBe('Sam, dim · b');
    expect(t(['', '', '', '', 'c', '', ''])).toBe('Ven · c');
    expect(t(['a', '', 'a', '', '', '', ''])).toBe('Lun · a ; mer · a');
    expect(t(['a', 'a', 'b', 'b', 'b', '', ''])).toBe('Lun, mar · a ; mer → ven · b');
    expect(t(['', '', '', '', '', '', ''])).toBe('');
  });

  it('NL', () => {
    expect(t(['a', 'a', 'a', 'a', 'a', '', ''], 1)).toBe('Ma → vr · a');
    expect(t(['a', 'a', 'a', 'a', 'a', 'a', 'a'], 1)).toBe('Elke dag · a');
  });
});

describe('bundleWeek — today and when', () => {
  it('today\'s slot during the period; none before it', () => {
    const fri = week(at(2026, 10, 16));
    expect(fri.rows.map(r => [r.id, r.today])).toEqual([['a', ''], ['c', '']]);
    const sun = week(at(2026, 10, 18));
    expect(sun.rows.find(r => r.id === 'a')!.today).toBe('toute la journée');
    expect(week(at(2026, 10, 2)).rows.every(r => r.today === '')).toBe(true);
    expect(week(at(2026, 10, 20)).rows.find(r => r.id === 'a')!.when).toBe('Lun · avant 11 h ; dim · toute la journée');
  });
});

describe('the network bundles (document of 2 October 2026)', () => {
  it('are consistent: unique ids, known shops, days 1–7 with a slot in both languages, a price or a discount', () => {
    const { from, to, bundles } = BUNDLES;
    expect([from, to]).toEqual(['2026-10-15', '2026-12-15']);
    expect(new Set(bundles.map(b => b.id)).size).toBe(bundles.length);
    for (const b of bundles) {
      for (const id of [...(b.shops ?? []), ...Object.keys(b.shopContent ?? {})]) expect(BUNDLE_SHOPS[id]).toBeTruthy();
      const days = Object.entries(b.days);
      expect(days.length).toBeGreaterThan(0);
      for (const [n, slot] of days) {
        expect(Number(n)).toBeGreaterThanOrEqual(1);
        expect(Number(n)).toBeLessThanOrEqual(7);
        expect(slot!.every(t => t.length > 0)).toBe(true);
      }
      expect(b.price !== null || !!b.offer).toBe(true);
    }
  });

  it('the last word of a slot is glued to the one before (narrow portrait cells)', () => {
    const w = bundleWeek(new Date(2026, 9, 20, 12), '2', 0)!;
    expect(w.rows.find(r => r.id === 'petitdej')!.cells[0]).toBe('avant 11\u00a0h');
    expect(w.rows.find(r => r.id === 'site')!.price).toBe('−20\u00a0%');
  });

  it('Corbais has no "Quiche + tarte"; Halle has its own', () => {
    const w = (shop: string) => JSON.parse(JSON.stringify(bundleWeek(new Date(2026, 9, 20, 12), shop, 0)).replace(/\u00a0/g, ' ')) as BundleWeekVM;
    expect(w('2').rows.map(r => r.id)).not.toContain('quichetarte');
    expect(w('4').rows.find(r => r.id === 'quichetarte')!.content).toBe('½ quiche + ½ tarte');
    expect(w('5').rows.map(r => [r.name, r.price])).toEqual([
      ['Offre site', '−20 %'], ['Le petit-déj', '3,50 €'], ['Le lunch', '8,50 €'], ['Formule bureau', '7,90 €'],
      ['Le goûter', '4,50 €'], ['Quiche + tarte', '19,90 €'], ['4 + 2 croissants', '6,90 €'], ['Grands formats', '19,90 €'],
    ]);
  });
});
