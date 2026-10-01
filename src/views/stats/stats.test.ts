import { describe, expect, it } from 'vitest';
import { BOOK } from '../../data/book';
import type { Lang, Period, Seller, Stats } from '../../data/types';
import { PRODUCTS } from '../../lib/catalog';
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

const seller = (id: string, d: [number, number, number, number], top: [string, number][] = [], bars = [1, 1, 1, 1, 1, 1, 1]): Seller => {
  const ps = { ca: d[0], tickets: d[1], cross: d[2], saison: d[3] };
  return { id, name: id.toUpperCase(), day: ps, week: ps, month: ps, bars, top };
};

describe('selectedSellers / aggregate', () => {
  it('team = all 5 sellers, a seller id = that seller only', () => {
    expect(selectedSellers('team').map(x => x.id)).toEqual(['sophie', 'ines', 'marie', 'laura', 'chloe']);
    expect(selectedSellers('marie').map(x => x.id)).toEqual(['marie']);
  });

  it('team week: sums, ticket-weighted cross-sell rounded', () => {
    const g = aggregate(selectedSellers('team'), 'week');
    expect(g.ca).toBe(4310 + 3980 + 4620 + 3120 + 3560);
    expect(g.tickets).toBe(452 + 440 + 470 + 378 + 398);
    const w = (39 * 452 + 34 * 440 + 36 * 470 + 28 * 378 + 42 * 398) / 2138;
    expect(g.cross).toBe(Math.round(w));
    expect(g.saison).toBe(104 + 88 + 118 + 61 + 93);
  });

  it('single seller: own figures', () => {
    expect(aggregate(selectedSellers('laura'), 'day')).toEqual({ ca: 498, tickets: 61, cross: 26, saison: 8 });
    expect(aggregate(selectedSellers('chloe'), 'month')).toEqual({ ca: 14700, tickets: 1640, cross: 41, saison: 380 });
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

describe('dayBars', () => {
  it('team: sums per day, heights relative to the best day, last day flagged', () => {
    const d = dayBars(0, 'team');
    expect(d.map(x => x.label)).toEqual(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']);
    expect(d[6]).toMatchObject({ value: (3300).toLocaleString('fr-BE') + ' €', pct: 100, last: true });
    expect(d[5]).toMatchObject({ pct: Math.round((1933 / 3300) * 100), last: false });
    expect(d.filter(x => x.last)).toHaveLength(1);
  });

  it('NL day names and nl-BE amounts', () => {
    const d = dayBars(1, 'team');
    expect(d.map(x => x.label)).toEqual(['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']);
    expect(d[6].value).toBe('3.300 €');
  });

  it('single seller: own bars', () => {
    expect(dayBars(1, 'sophie').map(x => x.value)).toEqual(['580 €', '610 €', '642 €', '598 €', '702 €', '431 €', '747 €']);
  });
});

describe('top products', () => {
  it('mergeTop sums quantities by product, desc, ties keep first-seen order', () => {
    const list = [seller('a', [1, 1, 1, 1], [['x', 5], ['y', 3]]), seller('b', [1, 1, 1, 1], [['z', 5], ['y', 4], ['w', 8]])];
    expect(mergeTop(list)).toEqual([['w', 8], ['y', 7], ['x', 5], ['z', 5]]);
  });

  it('team: top 5 merged from every seller', () => {
    const t = topProducts(0, 'team');
    expect(t.map(x => [x.product.id, x.qty])).toEqual([['pistolet', 600], ['croissant', 402], ['cookie', 225], ['club', 206], ['brioche', 186]]);
    expect(t.map(x => x.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(t[0].qtyLabel).toBe('600 pcs');
    expect(t[1].product.name).toBe(PRODUCTS.croissant.name[0]);
  });

  it('single seller: own list re-sorted desc (NL)', () => {
    const t = topProducts(1, 'marie');
    expect(t.map(x => [x.product.id, x.qtyLabel])).toEqual([['croissant', '190 st.'], ['brioche', '102 st.'], ['tarteriz', '48 st.']]);
    expect(t[0].product.name).toBe(PRODUCTS.croissant.name[1]);
  });

  it('unknown product ids are skipped', () => {
    const st: Stats = { obj: BOOK.stats.obj, sellers: [seller('a', [1, 1, 1, 1], [['nope', 99], ['croissant', 1]])] };
    expect(topProducts(0, 'team', st).map(x => [x.rank, x.product.id])).toEqual([[1, 'croissant']]);
  });
});

describe('ranking', () => {
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

  it('chips: Équipe/Team + the 5 sellers; periods in both languages', () => {
    expect(statsView(0, 'team', 'week').sellers.map(c => c.label)).toEqual(['Équipe', 'Sophie', 'Inès', 'Marie', 'Laura', 'Chloé']);
    expect(statsView(1, 'team', 'week').sellers[0].label).toBe('Team');
    expect(statsView(0, 'team', 'week').periods.map(p => p.label)).toEqual(["Aujourd'hui", 'Cette semaine', 'Ce mois']);
    expect(statsView(1, 'team', 'week').periods.map(p => p.label)).toEqual(['Vandaag', 'Deze week', 'Deze maand']);
  });
});
