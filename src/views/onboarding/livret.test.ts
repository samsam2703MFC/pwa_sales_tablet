import { describe, expect, it } from 'vitest';
import { ONB_SHORT } from '../../data/onboardingShort';
import type { Lang } from '../../data/types';
import {
  clean, fullBlocks, isExerciseHeading, livret, moduleCards, modulePage, parseMd, shortModule, tableLayout, withoutExercises,
  type LivretBlock,
} from './livret.logic';

const LANGS: Lang[] = [0, 1];
const tables = (blocks: readonly LivretBlock[]) => blocks.filter(b => b.type === 'table');
const headings = (blocks: readonly { type: string; text?: string }[]) => blocks.filter(b => b.type === 'h').map(b => b.text);

describe('parseMd — modules', () => {
  it('finds the 7 modules (opening + 6), with label, duration and title (FR)', () => {
    const { mods } = livret(0);
    expect(mods).toHaveLength(7);
    expect(mods.map(m => m.label)).toEqual(['Ouverture', 'Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5', 'Module 6']);
    expect(mods.map(m => m.dur)).toEqual(['5 min', '30 min', '45 min', '45 min', '30 min', '60 min + dégustation', '60 min']);
    expect(mods[0].title).toBe('Vendre est un métier');
    expect(mods[1].title).toBe("L'expérience client : ce que le client ressent en entrant, et surtout en sortant");
    expect(mods[6].title).toBe('Téléphone et avis Google');
  });

  it('finds the 7 modules in NL too', () => {
    const { mods } = livret(1);
    expect(mods).toHaveLength(7);
    expect(mods.map(m => m.label)).toEqual(['Opening', 'Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5', 'Module 6']);
    expect(mods[5].dur).toBe('60 min + proeverij');
    expect(mods[4].title).toBe('Positieve woordenschat, nul ontkenning');
  });

  it('the "## L\'Atelier By ___ · …" heading (no " — ") is not a module', () => {
    for (const l of LANGS) expect(livret(l).mods.some(m => m.label.startsWith("L'Atelier"))).toBe(false);
  });

  it('every module starts with a paragraph and has `###` sections', () => {
    for (const l of LANGS) {
      for (const m of livret(l).mods.slice(1)) {
        expect(m.blocks[0].type).toBe('p');
        expect(headings(m.blocks).length).toBeGreaterThan(1);
      }
    }
  });
});

describe('parseMd — intro', () => {
  it('keeps the 3-cell rows of the overview table (header + 7), separator skipped', () => {
    for (const l of LANGS) {
      const { rows } = livret(l).intro;
      expect(rows).toHaveLength(8);
      expect(rows.every(r => r.length === 3)).toBe(true);
      expect(rows.some(r => /^-+$/.test(r[0]))).toBe(false);
    }
    expect(livret(0).intro.rows[0]).toEqual(['Partie', 'Ce que vous saurez faire à la fin', 'Durée']);
    expect(livret(1).intro.rows[0]).toEqual(['Deel', 'Wat u op het einde kunt', 'Duur']);
  });

  it('reads the method line', () => {
    expect(livret(0).intro.method).toMatch(/^Méthode : chaque module se fait en réunion d'équipe\./);
    expect(livret(1).intro.method).toMatch(/^Methode/);
  });
});

describe('moduleCards', () => {
  it('goal = "what you will know" column of the intro row i+1; icons in the fixed order', () => {
    const fr = moduleCards(livret(0));
    expect(fr).toHaveLength(7);
    expect(fr[0].goal).toBe('Comprendre pourquoi votre travail au comptoir fait vivre la boutique');
    expect(fr[3].goal).toBe("Proposer à chaque client un deuxième article lié à ce qu'il prend");
    expect(fr[6].goal).toBe('Transformer un appel en commande ou en visite, et collecter des avis 5★');
    expect(fr.map(m => m.icon)).toEqual(
      ['bread', 'cake', 'hot-drink', 'croissant', 'sweet-tart', 'savoury-tart', 'phone-orders'].map(n => `img/onb/${n}.png`),
    );
    expect(fr.map(m => m.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('NL goals', () => {
    const nl = moduleCards(livret(1));
    expect(nl[1].goal).toBe('Verzorgen wat de klant voelt als hij binnenkomt, en vooral als hij buitengaat');
    expect(nl[4].goal).toBe('Spreken zonder « niet », « niets », « probleem », « sorry »');
  });

  it('missing intro row → empty goal', () => {
    const lv = parseMd('## Module 1 · 5 min — A\n\nText\n');
    expect(moduleCards(lv)[0].goal).toBe('');
  });
});

describe('parseMd — tables', () => {
  it('opening: target table with empty cells (FR / NL)', () => {
    expect(tables(livret(0).mods[0].blocks)).toEqual([
      { type: 'table', head: ['Indicateur', 'Cible'], rows: [["Chiffre d'affaires vendu", ''], ['Ventes additionnelles', '']] },
    ]);
    expect(tables(livret(1).mods[0].blocks)).toEqual([
      { type: 'table', head: ['Indicator', 'Doelstelling'], rows: [['Verkochte omzet', ''], ['Bijverkopen', '']] },
    ]);
  });

  it('module 3: pairing table, separator row skipped', () => {
    const [t] = tables(livret(0).mods[3].blocks);
    expect(t).toMatchObject({ head: ['Le client prend', 'Vous proposez'] });
    if (t.type !== 'table') throw new Error();
    expect(t.rows).toHaveLength(5);
    expect(t.rows[0]).toEqual(['Un café', 'Une viennoiserie']);
  });

  it('module 4: replacement table, escaped brackets unescaped (FR / NL)', () => {
    for (const l of LANGS) {
      const [t] = tables(livret(l).mods[4].blocks);
      if (t.type !== 'table') throw new Error();
      expect(t.rows).toHaveLength(10);
      expect(t.rows[2][1]).toMatch(l ? /^Het is \[prijs\]/ : /^C'est \[prix\]/);
    }
  });

  it('module 5: two tables, the second one has 3 columns and blanks to fill', () => {
    const ts = tables(livret(0).mods[5].blocks);
    expect(ts).toHaveLength(2);
    const t = ts[1];
    if (t.type !== 'table') throw new Error();
    expect(t.head).toEqual(['Produit', 'Ce qui le rend différent', 'Votre phrase']);
    expect(t.rows).toHaveLength(6);
    expect(t.rows[0]).toEqual(['Baguette', 'Farine Label Rouge, levain doux', '']);
    expect(t.rows[2]).toEqual(['Croissant', '', '']);
  });

  it('a blank line ends a table; the next table starts a new block', () => {
    const lv = parseMd('## M · 1 min — T\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n| c | d |\n| 3 | 4 |\n');
    expect(lv.mods[0].blocks).toEqual([
      { type: 'table', head: ['a', 'b'], rows: [['1', '2']] },
      { type: 'table', head: ['c', 'd'], rows: [['3', '4']] },
    ]);
  });

  it('tableLayout: 140 px min per column, min width = columns × 160', () => {
    expect(tableLayout(2)).toEqual({ cols: 'repeat(2,minmax(140px,1fr))', minW: '320px' });
    expect(tableLayout(3)).toEqual({ cols: 'repeat(3,minmax(140px,1fr))', minW: '480px' });
  });
});

describe('parseMd — lists and paragraphs', () => {
  it('✕ / ✓ bullets: kind + text without the mark (FR)', () => {
    const m1 = livret(0).mods[1].blocks;
    const scripts = m1.filter(b => b.type === 'ul').map(b => (b.type === 'ul' ? b.items : []));
    expect(scripts[1]).toEqual([
      { kind: 'bad', text: 'Vous continuez sans lever les yeux.' },
      { kind: 'good', text: 'Un regard, un sourire : « Bonjour, je suis à vous dans un instant. »' },
    ]);
    // a script with only the ✓ line
    expect(scripts[3]).toEqual([{ kind: 'good', text: '« Voilà, Monsieur Dubois. Belle journée, et à demain ! »' }]);
  });

  it('plain bullets (module 1 exit gestures, module 5 "what you can say") — FR / NL', () => {
    for (const l of LANGS) {
      const ul = livret(l).mods[5].blocks.find(b => b.type === 'ul');
      if (ul?.type !== 'ul') throw new Error();
      expect(ul.items).toHaveLength(4);
      expect(ul.items.every(it => it.kind === 'plain')).toBe(true);
    }
    const m1 = livret(0).mods[1].blocks.find(b => b.type === 'ul');
    if (m1?.type !== 'ul') throw new Error();
    expect(m1.items[0].text).toBe('Le produit est emballé avec soin et remis en main, jamais posé ni glissé sur le comptoir.');
  });

  it('numbered lists keep their numbers and merge consecutive items (blank lines allowed)', () => {
    const ol = livret(0).mods[1].blocks.find(b => b.type === 'ol');
    if (ol?.type !== 'ol') throw new Error();
    expect(ol.items.map(i => i.n)).toEqual(['1', '2', '3']);
    expect(ol.items[1].text).toBe('« Bonjour », dit en premier, par vous. C\'est vous qui recevez chez vous, c\'est à vous d\'ouvrir.');
    const lv = parseMd('## M · 1 min — T\n\n1. a\n\n2. b\n- c\n3. d\n');
    expect(lv.mods[0].blocks.map(b => b.type)).toEqual(['ol', 'ul', 'ol']);
  });

  it('"Ce que ça fait progresser" / "Wat het doet groeien" paragraphs are gains (modules 1–6)', () => {
    for (const l of LANGS) {
      const gains = livret(l).mods.flatMap(m => m.blocks.filter(b => b.type === 'gain'));
      expect(gains).toHaveLength(6);
      expect(gains[0].type === 'gain' && gains[0].text).toMatch(l ? /^Wat het doet groeien/ : /^Ce que ça fait progresser/);
    }
  });

  it('clean(): unescapes \\_ \\[ \\] \\*, drops ** and trims', () => {
    expect(clean('  L\'Atelier By \\_\\_ \\[x\\] \\* **gras**  ')).toBe("L'Atelier By __ [x] * gras");
  });

  it('content under a non-module `##` heading is ignored', () => {
    const lv = parseMd('## M · 1 min — T\n\nkept\n\n## Annexe\n\nignored\n');
    expect(lv.mods).toHaveLength(1);
    expect(lv.mods[0].blocks).toEqual([{ type: 'p', text: 'kept' }]);
  });
});

describe('Exercise sections', () => {
  it('withoutExercises drops the heading and everything up to the next heading', () => {
    const blocks: LivretBlock[] = [
      { type: 'p', text: 'intro' },
      { type: 'h', text: 'A' },
      { type: 'p', text: 'a' },
      { type: 'h', text: 'Exercice' },
      { type: 'p', text: 'do it' },
      { type: 'gain', text: 'Ce que ça fait progresser : x' },
    ];
    expect(withoutExercises(blocks)).toEqual([{ type: 'p', text: 'intro' }, { type: 'h', text: 'A' }, { type: 'p', text: 'a' }]);
  });

  it('prototype quirk kept: the heading right after an exercise is dropped too (its content is kept)', () => {
    const blocks: LivretBlock[] = [
      { type: 'p', text: 'intro' },
      { type: 'h', text: 'A' },
      { type: 'p', text: 'a' },
      { type: 'h', text: 'Exercice' },
      { type: 'p', text: 'do it' },
      { type: 'gain', text: 'Ce que ça fait progresser : x' },
      { type: 'h', text: 'B' },
      { type: 'p', text: 'b' },
    ];
    expect(withoutExercises(blocks)).toEqual([
      { type: 'p', text: 'intro' }, { type: 'h', text: 'A' }, { type: 'p', text: 'a' }, { type: 'p', text: 'b' },
    ]);
  });

  it('only an exact "Exercice" / "Oefening" heading counts', () => {
    expect(isExerciseHeading({ type: 'h', text: 'Exercice' })).toBe(true);
    expect(isExerciseHeading({ type: 'h', text: 'Oefening' })).toBe(true);
    expect(isExerciseHeading({ type: 'h', text: 'Exercice 2' })).toBe(false);
    expect(isExerciseHeading({ type: 'p', text: 'Exercice' })).toBe(false);
    expect(isExerciseHeading(undefined)).toBe(false);
  });

  it('the full version of every module has no exercise (and so no trailing gain) — FR / NL', () => {
    for (const l of LANGS) {
      for (const m of livret(l).mods) {
        const raw = headings(m.blocks);
        const full = fullBlocks(m.blocks);
        expect(headings(full)).toEqual(raw.filter(h => h !== (l ? 'Oefening' : 'Exercice')));
        expect(full.some(b => b.type === 'gain')).toBe(false);
      }
    }
    // modules 1–6 each had one
    expect(livret(0).mods.filter(m => headings(m.blocks).includes('Exercice'))).toHaveLength(6);
    expect(livret(1).mods.filter(m => headings(m.blocks).includes('Oefening'))).toHaveLength(6);
  });

  it('fullBlocks adds the grid layout to tables', () => {
    const t = fullBlocks(livret(0).mods[5].blocks).filter(b => b.type === 'table');
    expect(t.map(b => b.type === 'table' && [b.cols, b.minW])).toEqual([
      ['repeat(2,minmax(140px,1fr))', '320px'],
      ['repeat(3,minmax(140px,1fr))', '480px'],
    ]);
  });
});

describe('shortModule', () => {
  it('opening: rule + 3 points, no script, no gain (FR)', () => {
    const sh = shortModule(ONB_SHORT[0], 0)!;
    expect(sh.rule).toMatch(/^Vendre est un métier/);
    expect(sh.points).toHaveLength(3);
    expect(sh.scripts).toEqual([]);
    expect(sh.gain).toBeNull();
  });

  it('module 1: script with ✕ and ✓ lines, gain (NL)', () => {
    const sh = shortModule(ONB_SHORT[1], 1)!;
    expect(sh.rule).toMatch(/^Een klant vergeet snel/);
    expect(sh.scripts).toHaveLength(1);
    expect(sh.scripts[0].ctx).toBe('Een klant kocht een grote taart voor een verjaardag.');
    expect(sh.scripts[0].bad).toMatch(/^« 24 €\. Bedankt, dag\. »/);
    expect(sh.gain).toBe('Wat het doet groeien: de terugkeer van de klanten, en de 5★-reviews.');
  });

  it('module 5: script without ✕ line → bad = null', () => {
    expect(shortModule(ONB_SHORT[5], 0)!.scripts[0].bad).toBeNull();
  });

  it('no short data → null', () => {
    expect(shortModule(undefined, 0)).toBeNull();
  });
});

describe('modulePage', () => {
  it('first module: no previous, next = "Module 1"', () => {
    const m = modulePage(livret(0), 0, 0)!;
    expect(m.prev).toBeNull();
    expect(m.next).toEqual({ index: 1, label: 'Module 1' });
    expect(m.label).toBe('Ouverture');
    expect(m.icon).toBe('img/onb/bread.png');
    expect(m.short?.rule).toMatch(/^Vendre est un métier/);
  });

  it('last module: previous = "Module 5", no next (NL)', () => {
    const m = modulePage(livret(1), 6, 1)!;
    expect(m.prev).toEqual({ index: 5, label: 'Module 5' });
    expect(m.next).toBeNull();
    expect(m.title).toBe('Telefoon en Google-reviews');
  });

  it('out of range → null (the list is shown)', () => {
    expect(modulePage(livret(0), -1, 0)).toBeNull();
    expect(modulePage(livret(0), 7, 0)).toBeNull();
  });

  it('module without short version → short = null', () => {
    expect(modulePage(livret(0), 2, 0, [])!.short).toBeNull();
  });
});
