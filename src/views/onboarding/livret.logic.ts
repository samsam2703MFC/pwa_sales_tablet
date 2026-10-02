import frMd from '../../content/livret-fr.md?raw';
import nlMd from '../../content/livret-nl.md?raw';
import { ONB_SHORT } from '../../data/onboardingShort';
import type { Lang, OnbShortModule } from '../../data/types';
import { tr } from '../../lib/catalog';

/* ==========================================================================
   Livret (full training booklet) — Markdown parser, ported from the
   prototype's `parseMd()` with the exact same rules.
   ========================================================================== */

/** Numbered list item ("1. …"). */
export interface OlItem {
  n: string;
  text: string;
}

/** Bullet item ("- …"): "✕" = what not to say, "✓" = what to say, else a plain bullet. */
export interface UlItem {
  kind: 'bad' | 'good' | 'plain';
  text: string;
}

/** One block of a module's full text. */
export type LivretBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'gain'; text: string }
  | { type: 'ol'; items: OlItem[] }
  | { type: 'ul'; items: UlItem[] }
  | { type: 'table'; head: string[]; rows: string[][] };

/** A module = a `## Label · duration — Title` heading and everything up to the next `##`. */
export interface LivretModule {
  label: string;
  dur: string;
  title: string;
  blocks: LivretBlock[];
}

export interface Livret {
  mods: LivretModule[];
  /** Before the first module: rows of the 3-column overview table (header row included) and the "Méthode" line. */
  intro: { rows: string[][]; method: string };
}

/** Unescape Markdown (`\_`, `\[`, `\]`, `\*`), drop bold markers, trim. */
export const clean = (s: string): string => s.replace(/\\([_[\]*])/g, '$1').replace(/\*\*/g, '').trim();

/** Cells of a `| a | b |` row (outer pipes dropped). */
const cells = (l: string): string[] => l.split('|').slice(1, -1).map(clean);

const MODULE_HEADING = /^(.*?) · (.*?) — (.*)$/;
const GAIN = /^(Ce que ça fait progresser|Wat het doet groeien)/;

/** Parse the livret Markdown into modules + intro (the prototype's `parseMd`). */
export function parseMd(md: string): Livret {
  const mods: LivretModule[] = [];
  const intro = { rows: [] as string[][], method: '' };
  let cur: LivretModule | null = null;
  let tbl: Extract<LivretBlock, { type: 'table' }> | null = null;

  for (const raw of md.split('\n')) {
    const l = raw.trim();
    if (!l.startsWith('|')) tbl = null;
    if (l.startsWith('# ')) continue;
    if (l.startsWith('## ')) {
      const m = clean(l.slice(3)).match(MODULE_HEADING);
      if (m) {
        cur = { label: m[1], dur: m[2], title: m[3], blocks: [] };
        mods.push(cur);
      } else cur = null;
      continue;
    }
    if (!l) continue;
    if (!cur) {
      if (l.startsWith('|')) {
        const c = cells(l);
        if (!/^-+$/.test(c[0]) && c.length === 3) intro.rows.push(c);
      } else if (/^(Méthode|Methode)/.test(l)) intro.method = clean(l);
      continue;
    }
    const B = cur.blocks;
    const last = B[B.length - 1];
    if (l.startsWith('### ')) {
      B.push({ type: 'h', text: clean(l.slice(4)) });
      continue;
    }
    if (l.startsWith('|')) {
      const c = cells(l);
      // separator row "| --- | --- |"
      if (c.every(x => /^-+$/.test(x.replace(/\s/g, '')))) continue;
      if (!tbl) {
        tbl = { type: 'table', head: c, rows: [] };
        B.push(tbl);
      } else tbl.rows.push(c);
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^(\d+)\.\s+(.*)$/))) {
      const it: OlItem = { n: m[1], text: clean(m[2]) };
      if (last?.type === 'ol') last.items.push(it);
      else B.push({ type: 'ol', items: [it] });
      continue;
    }
    if ((m = l.match(/^-\s+(.*)$/))) {
      const tx = m[1];
      const kind: UlItem['kind'] = tx.startsWith('✕') ? 'bad' : tx.startsWith('✓') ? 'good' : 'plain';
      const it: UlItem = { kind, text: clean(kind === 'plain' ? tx : tx.slice(1)) };
      if (last?.type === 'ul') last.items.push(it);
      else B.push({ type: 'ul', items: [it] });
      continue;
    }
    const tx = clean(l);
    B.push(GAIN.test(tx) ? { type: 'gain', text: tx } : { type: 'p', text: tx });
  }
  return { mods, intro };
}

/** Both livrets, parsed once (the Markdown is bundled: works offline, no loading state). */
const LIVRETS: readonly [Livret, Livret] = [parseMd(frMd), parseMd(nlMd)];
export const livret = (lang: Lang): Livret => LIVRETS[lang];

/* ==========================================================================
   View models
   ========================================================================== */

/** Module illustrations, in module order (img/onb/<name>.png). */
export const ONB_ICONS = ['bread', 'cake', 'hot-drink', 'croissant', 'sweet-tart', 'savoury-tart', 'phone-orders'] as const;

/** A module in the list (and the module page header). */
export interface ModuleCardVM {
  index: number;
  /** "Ouverture", "Module 1"… (from the `##` heading). */
  label: string;
  /** "30 min"… */
  dur: string;
  title: string;
  /** "Ce que vous saurez faire à la fin" column of the intro table. */
  goal: string;
  /** Data path of the illustration (resolve with `asset()`). */
  icon: string;
}

export const moduleCards = (lv: Livret): ModuleCardVM[] =>
  lv.mods.map((m, i) => ({
    index: i,
    label: m.label,
    dur: m.dur,
    title: m.title,
    goal: lv.intro.rows[i + 1]?.[1] || '',
    icon: `img/onb/${ONB_ICONS[i % ONB_ICONS.length]}.png`,
  }));

/** "À dire à voix haute" card of the short version. */
export interface ShortScriptVM {
  ctx: string;
  /** What not to say; null when the script has none. */
  bad: string | null;
  good: string;
}

/** Short version (≤ 1 min) of a module. */
export interface ShortVM {
  rule: string;
  points: string[];
  scripts: ShortScriptVM[];
  /** "Ce que ça fait progresser : …"; null when absent. */
  gain: string | null;
}

export const shortModule = (sh: OnbShortModule | undefined, lang: Lang): ShortVM | null =>
  sh
    ? {
      rule: tr(sh.rule, lang),
      points: sh.points.map(p => tr(p, lang)),
      scripts: sh.scripts.map(x => ({ ctx: tr(x.ctx, lang), bad: x.bad ? tr(x.bad, lang) : null, good: tr(x.good, lang) })),
      gain: sh.gain ? tr(sh.gain, lang) : null,
    }
    : null;

/** A table block, with its grid layout (140 px min per column, min width cols × 160 px). */
export interface TableVM {
  type: 'table';
  head: string[];
  rows: string[][];
  cols: string;
  minW: string;
}

export type FullBlockVM = Exclude<LivretBlock, { type: 'table' }> | TableVM;

const EXERCISE = /^(Exercice|Oefening)$/;
export const isExerciseHeading = (b: LivretBlock | undefined): boolean => !!b && b.type === 'h' && EXERCISE.test(b.text);

/**
 * Drop the "Exercice"/"Oefening" sections: the heading itself and every block whose
 * nearest preceding heading is one (so up to the next `###`), as in the prototype.
 * Same quirk as the prototype: a heading that directly follows an exercise section is
 * dropped too (never happens in the livret, where the exercise is always last).
 */
export const withoutExercises = (blocks: readonly LivretBlock[]): LivretBlock[] =>
  blocks.filter((b, bi, arr) => {
    if (isExerciseHeading(b)) return false;
    for (let k = bi - 1; k >= 0; k--) {
      if (arr[k].type === 'h') return !isExerciseHeading(arr[k]);
    }
    return true;
  });

export const tableLayout = (nCols: number): { cols: string; minW: string } => ({
  cols: `repeat(${nCols},minmax(140px,1fr))`,
  minW: `${nCols * 160}px`,
});

/** Blocks of the full version: exercises removed, tables laid out. */
export const fullBlocks = (blocks: readonly LivretBlock[]): FullBlockVM[] =>
  withoutExercises(blocks).map(b => (b.type === 'table' ? { ...b, ...tableLayout(b.head.length) } : b));

/** Previous / next module link (label only, e.g. "Module 2"). */
export interface ModuleLinkVM {
  index: number;
  label: string;
}

/** A module page. `short` is null when the module has no short version. */
export interface ModulePageVM extends ModuleCardVM {
  short: ShortVM | null;
  blocks: FullBlockVM[];
  prev: ModuleLinkVM | null;
  next: ModuleLinkVM | null;
}

/** Module `i` (null when out of range → the list is shown, as in the prototype). */
export function modulePage(lv: Livret, i: number, lang: Lang, shorts: readonly OnbShortModule[] = ONB_SHORT): ModulePageVM | null {
  const m = lv.mods[i];
  if (i < 0 || !m) return null;
  const link = (k: number): ModuleLinkVM | null => (lv.mods[k] ? { index: k, label: lv.mods[k].label } : null);
  return {
    ...moduleCards(lv)[i],
    short: shortModule(shorts[i], lang),
    blocks: fullBlocks(m.blocks),
    prev: i > 0 ? link(i - 1) : null,
    next: link(i + 1),
  };
}
