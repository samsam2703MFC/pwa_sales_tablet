import { describe, expect, it } from 'vitest';
import { BASES, BASES_LABELS, basesIcon } from './bases';
import type { T2 } from './types';

type At = [where: string, pair: T2];
const at = (where: string, pair: T2): At => [where, pair];

/** Every [FR, NL] pair of the screen, with where it sits (for the failure message). */
const pairs = (): At[] => [
  ...BASES.flatMap(t => [
    at(`${t.id}.title`, t.title),
    at(`${t.id}.chip`, t.chip),
    at(`${t.id}.rule`, t.rule),
    ...(t.source ? [at(`${t.id}.source`, t.source)] : []),
    ...t.steps.map((x, i) => at(`${t.id}.steps[${i}]`, x)),
    ...t.say.map((x, i) => at(`${t.id}.say[${i}]`, x)),
    ...t.avoid.map((x, i) => at(`${t.id}.avoid[${i}]`, x)),
  ]),
  ...Object.entries(BASES_LABELS).map(([k, v]) => at(`labels.${k}`, v)),
];

describe('Les bases — data', () => {
  it('six topics, in the agreed order, with unique ids', () => {
    expect(BASES.map(t => t.title[0])).toEqual([
      'Accueillir un client', 'Répondre au téléphone', 'Gérer un client mécontent',
      "Quand la file s'allonge", 'Fidéliser un client', 'Dire au revoir',
    ]);
    const ids = BASES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every text is a non-empty, trimmed [FR, NL] pair', () => {
    for (const [where, p] of pairs()) {
      expect(p, where).toHaveLength(2);
      for (const text of p) {
        expect(text.trim(), where).not.toBe('');
        expect(text, where).toBe(text.trim());
      }
      // the two languages are different texts (no forgotten translation)…
      if (!/^Module/.test(p[0])) expect(p[1], where).not.toBe(p[0]);
      // …and quotes are balanced in both
      for (const text of p) expect(text.split('«').length, where).toBe(text.split('»').length);
    }
  });

  it('3–5 steps, then at least 2 and at most 3 phrases in each script list', () => {
    for (const t of BASES) {
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.steps.length, t.id).toBeLessThanOrEqual(5);
      for (const list of [t.say, t.avoid]) {
        expect(list.length, t.id).toBeGreaterThanOrEqual(2);
        expect(list.length, t.id).toBeLessThanOrEqual(3);
      }
    }
  });

  it('the illustrations exist in public/img/onb/', () => {
    const files = new Set(Object.keys(import.meta.glob('/public/img/onb/*.png')).map(f => f.replace('/public/', '')));
    expect(files.size).toBeGreaterThan(0);
    for (const t of BASES) expect(files.has(basesIcon(t.icon)), t.icon).toBe(true);
  });

  it('"Ce qu\'on dit" uses none of the module 4 words (livret: zéro négation)', () => {
    // whole words (Unicode letters: `\b` would miss "désolé")
    const FR = /(?<!\p{L})(pas|rien|jamais|problème|souci|désolée?s?|malheureusement|impossible|normalement)(?!\p{L})/iu;
    const NL = /(?<!\p{L})(niet|niets|geen|nooit|probleem|zorgen|sorry|helaas|onmogelijk|normaal)(?!\p{L})/iu;
    // the check catches the livret's own ✕ examples
    expect('« Désolé pour l\'attente. »').toMatch(FR);
    expect('« Sorry voor het wachten. »').toMatch(NL);
    expect('« Je ne sais pas, normalement il faut prévenir avant. »').toMatch(FR);
    for (const t of BASES) {
      for (const [fr, nl] of t.say) {
        expect(fr, t.id).not.toMatch(FR);
        expect(nl, t.id).not.toMatch(NL);
      }
    }
  });
});
