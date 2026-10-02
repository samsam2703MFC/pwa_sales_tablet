import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { Lang, Period, Seller, Stats } from '../../data/types';
import { PRODUCTS } from '../../lib/catalog';
import { FIXTURE_BOOK as F, FIXTURE_CATALOG as LK, seller } from '../../test/fixtures';
import {
  aggregate, dayBars, kpiCards, mergeTop, progressPct, ranking, selectedSellers, statsView, topProducts,
} from './stats.logic';

const PERIODS: Period[] = ['day', 'week', 'month'];
const SELS = ['team', ...BOOK.stats.sellers.map(x => x.id)];
const LANGS: Lang[] = [0, 1];

/** Reference implementation: the prototype's renderVals "stats" block, verbatim (labels aside). */
function reference(li: Lang, stSel: string, per: Period) {
  const ST = BOOK.stats;
  const eur = (n: number) => Math.round(n).toLocaleString(li ? 'nl-BE' : 'fr-BE') + ' €';
  const eur2 = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
  const agg = (list: Seller[]) => { const tk = list.reduce((a, x) => a + x[per].tickets, 0); return { ca: list.reduce((a, x) => a + x[per].ca, 0), tickets: tk, cross: Math.round(list.reduce((a, x) => a + x[per].cross * x[per].tickets, 0) / tk), saison: list.reduce((a, x) => a + x[per].saison, 0) }; };
  const isTeam = stSel === 'team';
  const cur = isTeam ? ST.sellers : ST.sellers.filter(x => x.id === stSel);
  const g = agg(cur), nS = cur.length;
  const objSaison = ST.obj.saison[per] * nS, pan = g.ca / g.tickets;
  const pct = (v: number, o: number) => Math.max(4, Math.min(100, Math.round(v / o * 100)));
  const kpis = [
    { value: eur(g.ca), w: null as number | null, hit: null as boolean | null },
    { value: eur2(pan), w: pct(pan, ST.obj.panier), hit: pan >= ST.obj.panier },
    { value: g.cross + ' %', w: pct(g.cross, ST.obj.cross), hit: g.cross >= ST.obj.cross },
    { value: String(g.saison), w: pct(g.saison, objSaison), hit: g.saison >= objSaison, obj: objSaison },
  ];
  const barsV = [0, 1, 2, 3, 4, 5, 6].map(i => cur.reduce((a, x) => a + x.bars[i], 0));
  const bMax = Math.max(...barsV);
  const dayBars = barsV.map(v => ({ v: eur(v), h: Math.round(v / bMax * 100) }));
  const topMap: Record<string, number> = {}; cur.forEach(x => x.top.forEach(([id, n]) => topMap[id] = (topMap[id] || 0) + n));
  const topList = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rankRows = [...ST.sellers].sort((a, b) => b[per].ca - a[per].ca).map(x => { const d = x[per]; return {
    id: x.id, ca: eur(d.ca), pan: eur2(d.ca / d.tickets), cross: d.cross + ' %', saison: d.saison + '', crossHit: d.cross >= ST.obj.cross, on: stSel === x.id }; });
  return { g, kpis, dayBars, topList, rankRows };
}

describe('selectedSellers / aggregate', () => {
  it('team = every seller, a seller id = that seller only, an unknown id = nobody', () => {
    expect(selectedSellers('team', F.stats).map(x => x.id)).toEqual(['ana', 'bea']);
    expect(selectedSellers('bea', F.stats).map(x => x.id)).toEqual(['bea']);
    expect(selectedSellers('ghost', F.stats)).toEqual([]);
  });

  it('team: sums, ticket-weighted cross-sell rounded; single seller: own figures', () => {
    expect(aggregate(selectedSellers('team', F.stats), 'week')).toEqual({ ca: 300, tickets: 30, cross: 30, saison: 8 }); // (40×20 + 10×10) / 30
    expect(aggregate(selectedSellers('ana', F.stats), 'day')).toEqual({ ca: 200, tickets: 20, cross: 40, saison: 6 });
  });

  it('weighted average favours sellers with more tickets', () => {
    const list = [seller('a', [100, 10, 10, 0]), seller('b', [100, 30, 50, 0])];
    expect(aggregate(list, 'day').cross).toBe(40); // (100 + 1500) / 40
  });
});

describe('progressPct', () => {
  it('rounds and clamps to 4–100', () => {
    expect(progressPct(9.5, 9.5)).toBe(100);
    expect(progressPct(20, 9.5)).toBe(100);
    expect(progressPct(0, 35)).toBe(4);
    expect(progressPct(1, 35)).toBe(4);
    expect(progressPct(26, 35)).toBe(74);
    expect(progressPct(61, 90)).toBe(68);
  });
});

describe('kpiCards', () => {
  it('values, objectives and statuses (FR / NL)', () => {
    const k = kpiCards(0, 'team', 'week', F.stats);
    expect(k.map(x => x.label)).toEqual(["Chiffre d'affaires", 'Panier moyen', 'Vente additionnelle', 'Produits de saison']);
    expect(k[0]).toMatchObject({ value: '300 €', sub: '30 tickets', pct: null, hit: null });
    expect(k[1]).toMatchObject({ value: '10,00 €', sub: 'Objectif 10,00 €', pct: 100, hit: true });
    expect(k[2]).toMatchObject({ value: '30 %', sub: 'Objectif 30 %', pct: 100, hit: true });
    // seasonal objective = 20 per seller × 2
    expect(k[3]).toMatchObject({ value: '8 pcs', sub: 'Objectif 40 pcs', pct: 20, hit: false });
    const nl = kpiCards(1, 'bea', 'day', F.stats);
    expect(nl.map(x => x.label)).toEqual(['Omzet', 'Gemiddeld ticket', 'Bijverkoop', 'Seizoensproducten']);
    expect(nl.map(x => [x.value, x.sub])).toEqual([['100 €', '10 tickets'], ['10,00 €', 'Doel 10,00 €'], ['10 %', 'Doel 30 %'], ['2 st.', 'Doel 5 st.']]);
  });

  it('thousands separators follow the locale (fr-BE / nl-BE)', () => {
    const big: Stats = { obj: F.stats.obj, sellers: [seller('a', [80690, 1, 1, 1])] };
    expect(kpiCards(0, 'team', 'month', big)[0].value).toBe((80690).toLocaleString('fr-BE') + ' €');
    expect(kpiCards(1, 'team', 'month', big)[0].value).toBe('80.690 €');
  });

  it('hit exactly at the objective, miss just below', () => {
    const at: Stats = { obj: { panier: 10, cross: 30, saison: { day: 5, week: 5, month: 5 } }, sellers: [seller('a', [100, 10, 30, 5])] };
    const below: Stats = { obj: at.obj, sellers: [seller('a', [99.9, 10, 29, 4])] };
    expect(kpiCards(0, 'team', 'day', at).slice(1).map(k => [k.hit, k.pct])).toEqual([[true, 100], [true, 100], [true, 100]]);
    expect(kpiCards(0, 'team', 'day', below).slice(1).map(k => [k.hit, k.pct])).toEqual([[false, 100], [false, 97], [false, 80]]);
  });

  it('seasonal objective scales with the number of selected sellers', () => {
    const st: Stats = { obj: { panier: 1, cross: 1, saison: { day: 10, week: 50, month: 200 } }, sellers: [seller('a', [1, 1, 1, 12]), seller('b', [1, 1, 1, 7])] };
    expect(kpiCards(0, 'team', 'week', st)[3]).toMatchObject({ sub: 'Objectif 100 pcs', hit: false, pct: 19 });
    expect(kpiCards(0, 'a', 'day', st)[3]).toMatchObject({ sub: 'Objectif 10 pcs', hit: true, pct: 100 });
    expect(kpiCards(0, 'b', 'day', st)[3]).toMatchObject({ sub: 'Objectif 10 pcs', hit: false, pct: 70 });
  });
});

describe('top products', () => {
  it('mergeTop sums quantities by product, desc, ties keep first-seen order', () => {
    const list = [seller('a', [1, 1, 1, 1], [['x', 5], ['y', 3]]), seller('b', [1, 1, 1, 1], [['z', 5], ['y', 4], ['w', 8]])];
    expect(mergeTop(list)).toEqual([['w', 8], ['y', 7], ['x', 5], ['z', 5]]);
  });

  it('team: merged lists, sorted desc, unknown product ids skipped, ranked from 1 (FR / NL)', () => {
    const t = topProducts(0, 'team', F.stats, LK);
    expect(t.map(x => [x.rank, x.product.id, x.qty, x.qtyLabel])).toEqual([[1, 'p1', 9, '9 pcs'], [2, 'p3', 7, '7 pcs'], [3, 'p2', 1, '1 pcs']]);
    expect(topProducts(1, 'bea', F.stats, LK).map(x => [x.product.name, x.qtyLabel])).toEqual([['p1-nl', '4 st.'], ['p2-nl', '1 st.']]);
  });

  it('keeps the first 5', () => {
    const top: [string, number][] = [['p1', 6], ['p2', 5], ['p3', 4], ['p4', 3], ['p5', 2], ['p1', 0]];
    const st: Stats = { obj: F.stats.obj, sellers: [seller('a', [1, 1, 1, 1], top)] };
    expect(topProducts(0, 'team', st, LK).map(x => x.product.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });
});

describe('dayBars', () => {
  const st: Stats = { obj: F.stats.obj, sellers: [seller('a', [1, 1, 1, 1], [], [10, 20, 30, 40, 50, 60, 1000]), seller('b', [1, 1, 1, 1], [], [0, 0, 0, 0, 0, 0, 1000])] };

  it('sums the selection per day, heights relative to the best day, last day flagged', () => {
    const d = dayBars(0, 'team', st);
    expect(d.map(x => x.label)).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']);
    expect(d.map(x => x.pct)).toEqual([1, 1, 2, 2, 3, 3, 100]);
    expect(d[6]).toMatchObject({ value: (2000).toLocaleString('fr-BE') + ' €', last: true });
    expect(d.filter(x => x.last)).toHaveLength(1);
    expect(dayBars(0, 'a', st).map(x => x.pct)).toEqual([1, 2, 3, 4, 5, 6, 100]);
  });

  it('NL day names and nl-BE amounts', () => {
    const d = dayBars(1, 'team', st);
    expect(d.map(x => x.label)).toEqual(['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']);
    expect(d[6].value).toBe('2.000 €');
  });
});

describe('ranking', () => {
  it('whole team by revenue of the period, even when a seller is selected; figures and cross-sell threshold', () => {
    const r = ranking(0, 'bea', 'day', F.stats);
    expect(r).toEqual([
      { id: 'ana', rank: 1, name: 'ANA', ca: '200 €', pan: '10,00 €', cross: '40 %', crossHit: true, saison: '6', on: false },
      { id: 'bea', rank: 2, name: 'BEA', ca: '100 €', pan: '10,00 €', cross: '10 %', crossHit: false, saison: '2', on: true },
    ]);
    const atObjective: Stats = { obj: F.stats.obj, sellers: [seller('a', [1, 1, 30, 0])] };
    expect(ranking(0, 'team', 'week', atObjective)[0].crossHit).toBe(true);
  });
});

describe('zero tickets / zero sales (real till data): never NaN', () => {
  // A seller off today (0 tickets, 0 sales all week) next to the team.
  const nora = seller('nora', [0, 0, 0, 0], [], [0, 0, 0, 0, 0, 0, 0]);
  const withNora: Stats = { obj: F.stats.obj, sellers: [...F.stats.sellers, nora] };
  const allZero: Stats = { obj: F.stats.obj, sellers: [nora, seller('zoe', [0, 0, 0, 0], [], [0, 0, 0, 0, 0, 0, 0])] };
  const noNaN = (x: unknown) => expect(JSON.stringify(x)).not.toContain('NaN');

  it('aggregate: cross-sell rate 0 when the whole selection has 0 tickets', () => {
    expect(aggregate(allZero.sellers, 'day')).toEqual({ ca: 0, tickets: 0, cross: 0, saison: 0 });
    expect(aggregate([], 'week')).toEqual({ ca: 0, tickets: 0, cross: 0, saison: 0 });
  });

  it('progressPct: a zero objective is reached (full bar), never NaN', () => {
    expect(progressPct(0, 0)).toBe(100);
    expect(progressPct(5, 0)).toBe(100);
  });

  for (const lang of LANGS) for (const per of PERIODS) {
    it(`kpiCards for a 0-ticket seller (${lang ? 'NL' : 'FR'} ${per}): 0,00 € / 0 %, 4 % stub, objective not reached`, () => {
      const k = kpiCards(lang, 'nora', per, withNora);
      noNaN(k);
      expect(k.map(x => x.value)).toEqual(['0 €', '0,00 €', '0 %', '0 ' + (lang ? 'st.' : 'pcs')]);
      expect(k.map(x => x.pct)).toEqual([null, 4, 4, 4]);
      expect(k.map(x => x.hit)).toEqual([null, false, false, false]);
      for (const x of k) if (x.pct != null) expect(Number.isFinite(x.pct)).toBe(true);
    });
  }

  it('kpiCards for a whole team at 0 tickets: no NaN', () => {
    const k = kpiCards(0, 'team', 'day', allZero);
    noNaN(k);
    expect(k[1]).toMatchObject({ value: '0,00 €', pct: 4, hit: false });
    expect(k[2]).toMatchObject({ value: '0 %', pct: 4, hit: false });
  });

  it('team figures are unchanged by a 0-ticket seller (ticket-weighted cross)', () => {
    const k = kpiCards(0, 'team', 'week', withNora);
    const ref = kpiCards(0, 'team', 'week', F.stats);
    expect(k.slice(0, 3).map(x => [x.value, x.pct, x.hit])).toEqual(ref.slice(0, 3).map(x => [x.value, x.pct, x.hit]));
  });

  it('ranking: the 0-ticket seller shows 0,00 € last, no NaN', () => {
    for (const per of PERIODS) {
      const r = ranking(0, 'nora', per, withNora);
      noNaN(r);
      expect(r.at(-1)).toMatchObject({ id: 'nora', rank: 3, ca: '0 €', pan: '0,00 €', cross: '0 %', crossHit: false, saison: '0', on: true });
    }
  });

  it('dayBars: a week without sales gives 0-height bars, every pct finite', () => {
    for (const st of [withNora, allZero]) {
      const d = dayBars(0, st === allZero ? 'team' : 'nora', st);
      noNaN(d);
      expect(d.map(x => x.pct)).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(d.map(x => x.value)).toEqual(Array(7).fill('0 €'));
    }
  });

  it('statsView: unknown seller id (empty selection) renders zeros, no NaN', () => {
    const vm = statsView(0, 'ghost', 'day', F.stats, LK);
    noNaN(vm);
    expect(vm.kpis.map(x => x.value)).toEqual(['0 €', '0,00 €', '0 %', '0 pcs']);
    expect(vm.days.every(x => x.pct === 0)).toBe(true);
  });
});

// Parity with the prototype's maths, whatever the book holds (the reference reads it too).
describe('statsView matches the prototype for every language × selection × period', () => {
  for (const lang of LANGS) for (const sel of SELS) for (const per of PERIODS) {
    it(`${lang ? 'NL' : 'FR'} ${sel} ${per}`, () => {
      const ref = reference(lang, sel, per);
      const vm = statsView(lang, sel, per);
      expect(vm.kpis.map(k => k.pct)).toEqual(ref.kpis.map(k => k.w));
      expect(vm.kpis.map(k => k.hit)).toEqual(ref.kpis.map(k => k.hit));
      expect(vm.kpis[0].value).toBe(ref.kpis[0].value);
      expect(vm.kpis[1].value).toBe(ref.kpis[1].value);
      expect(vm.kpis[2].value).toBe(ref.kpis[2].value);
      expect(vm.kpis[3].value.split(' ')[0]).toBe(ref.kpis[3].value);
      expect(vm.kpis[3].sub).toContain(' ' + ref.kpis[3].obj + ' ');
      expect(vm.days.map(d => [d.value, d.pct])).toEqual(ref.dayBars.map(d => [d.v, d.h]));
      expect(vm.top.map(t => [t.product.id, t.qty])).toEqual(ref.topList);
      expect(vm.rank.map(r => ({ id: r.id, ca: r.ca, pan: r.pan, cross: r.cross, saison: r.saison, crossHit: r.crossHit, on: r.on }))).toEqual(ref.rankRows);
      expect(vm.periods.filter(p => p.active).map(p => p.id)).toEqual([per]);
      expect(vm.sellers.filter(c => c.active).map(c => c.id)).toEqual([sel]);
    });
  }

  it('chips: Équipe/Team + the sellers; periods in both languages', () => {
    expect(statsView(0, 'team', 'week', F.stats, LK).sellers.map(c => c.label)).toEqual(['Équipe', 'ANA', 'BEA']);
    expect(statsView(1, 'team', 'week', F.stats, LK).sellers[0].label).toBe('Team');
    expect(statsView(0, 'team', 'week').periods.map(p => p.label)).toEqual(["Aujourd'hui", 'Cette semaine', 'Ce mois']);
    expect(statsView(1, 'team', 'week').periods.map(p => p.label)).toEqual(['Vandaag', 'Deze week', 'Deze maand']);
  });
});

describe('sample data (prototype golden values)', () => {
  it('team = the 5 sellers', () => {
    expect(selectedSellers('team').map(x => x.id)).toEqual(['sophie', 'ines', 'marie', 'laura', 'chloe']);
    expect(statsView(0, 'team', 'week').sellers.map(c => c.label)).toEqual(['Équipe', 'Sophie', 'Inès', 'Marie', 'Laura', 'Chloé']);
  });

  it('team week: sums, ticket-weighted cross-sell rounded', () => {
    const g = aggregate(selectedSellers('team'), 'week');
    expect(g.ca).toBe(4310 + 3980 + 4620 + 3120 + 3560);
    expect(g.tickets).toBe(452 + 440 + 470 + 378 + 398);
    expect(g.cross).toBe(Math.round((39 * 452 + 34 * 440 + 36 * 470 + 28 * 378 + 42 * 398) / 2138));
    expect(g.saison).toBe(104 + 88 + 118 + 61 + 93);
    expect(aggregate(selectedSellers('laura'), 'day')).toEqual({ ca: 498, tickets: 61, cross: 26, saison: 8 });
    expect(aggregate(selectedSellers('chloe'), 'month')).toEqual({ ca: 14700, tickets: 1640, cross: 41, saison: 380 });
  });

  it('team week FR: values, objectives and statuses', () => {
    const k = kpiCards(0, 'team', 'week');
    expect(k.map(x => x.label)).toEqual(["Chiffre d'affaires", 'Panier moyen', 'Vente additionnelle', 'Produits de saison']);
    expect(k[0]).toMatchObject({ value: (19590).toLocaleString('fr-BE') + ' €', sub: '2138 tickets', pct: null, hit: null });
    expect(k[1]).toMatchObject({ value: '9,16 €', sub: 'Objectif 9,50 €', pct: 96, hit: false });
    expect(k[2]).toMatchObject({ value: '36 %', sub: 'Objectif 35 %', pct: 100, hit: true });
    // seasonal objective = 90 per seller × 5
    expect(k[3]).toMatchObject({ value: '464 pcs', sub: 'Objectif 450 pcs', pct: 100, hit: true });
  });

  it('single seller day NL: objective for one seller', () => {
    const k = kpiCards(1, 'laura', 'day');
    expect(k.map(x => x.label)).toEqual(['Omzet', 'Gemiddeld ticket', 'Bijverkoop', 'Seizoensproducten']);
    expect(k[0]).toMatchObject({ value: '498 €', sub: '61 tickets' });
    expect(k[1]).toMatchObject({ value: '8,16 €', sub: 'Doel 9,50 €', pct: 86, hit: false });
    expect(k[2]).toMatchObject({ value: '26 %', sub: 'Doel 35 %', pct: 74, hit: false });
    expect(k[3]).toMatchObject({ value: '8 st.', sub: 'Doel 15 st.', pct: 53, hit: false });
  });

  it('thousands separators follow the locale (fr-BE / nl-BE)', () => {
    expect(kpiCards(0, 'team', 'month')[0].value).toBe((80690).toLocaleString('fr-BE') + ' €');
    expect(kpiCards(1, 'team', 'month')[0].value).toBe('80.690 €');
  });

  it('team day bars', () => {
    const d = dayBars(0, 'team');
    expect(d.map(x => x.label)).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']);
    expect(d[6]).toMatchObject({ value: (3300).toLocaleString('fr-BE') + ' €', pct: 100, last: true });
    expect(d[5]).toMatchObject({ pct: Math.round((1933 / 3300) * 100), last: false });
    expect(d.filter(x => x.last)).toHaveLength(1);
  });

  it('team day bars (NL)', () => {
    const d = dayBars(1, 'team');
    expect(d[6].value).toBe('3.300 €');
  });

  it('single seller: own bars', () => {
    expect(dayBars(1, 'sophie').map(x => x.value)).toEqual(['580 €', '610 €', '642 €', '598 €', '702 €', '431 €', '747 €']);
  });

  it('team: top 5 merged from every seller', () => {
    const t = topProducts(0, 'team');
    expect(t.map(x => [x.product.id, x.qty])).toEqual([['pistolet', 600], ['croissant', 402], ['cookie', 225], ['club', 206], ['brioche', 186]]);
    expect(t.map(x => x.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(t[0].qtyLabel).toBe('600 pcs');
    expect(t[1].product.name).toBe(PRODUCTS.croissant!.name[0]);
  });

  it('single seller: own list re-sorted desc (NL)', () => {
    const t = topProducts(1, 'marie');
    expect(t.map(x => [x.product.id, x.qtyLabel])).toEqual([['croissant', '190 st.'], ['brioche', '102 st.'], ['tarteriz', '48 st.']]);
    expect(t[0].product.name).toBe(PRODUCTS.croissant!.name[1]);
  });

  it('sorted by revenue of the period, whole team even when a seller is selected', () => {
    expect(ranking(0, 'team', 'week').map(r => r.id)).toEqual(['marie', 'sophie', 'ines', 'chloe', 'laura']);
    expect(ranking(0, 'laura', 'day').map(r => r.id)).toEqual(['marie', 'sophie', 'ines', 'chloe', 'laura']);
    const r = ranking(0, 'laura', 'day');
    expect(r.filter(x => x.on).map(x => x.id)).toEqual(['laura']);
    expect(r.map(x => x.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('row figures and cross-sell threshold (>= 35 % → hit)', () => {
    const r = ranking(1, 'team', 'month');
    const marie = r.find(x => x.id === 'marie')!;
    expect(marie).toMatchObject({ ca: '18.950 €', pan: '9,80 €', cross: '35 %', crossHit: true, saison: '455', on: false });
    expect(r.find(x => x.id === 'ines')).toMatchObject({ cross: '33 %', crossHit: false });
  });
});
