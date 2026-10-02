import { useId, useState, type ReactNode } from 'react';
import { Chip, ChipRow } from '../../components/Chip';
import { PageTitle } from '../../components/PageTitle';
import { BASES, BASES_LABELS as B, basesIcon, type BaseTopic } from '../../data/bases';
import type { Lang, T2 } from '../../data/types';
import { asset } from '../../lib/asset';
import { tr } from '../../lib/catalog';
import { navLabel, onbLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import s from './BasesView.module.css';

/**
 * Text of a pair in the current language, with no-break spaces where French typography
 * (and the livret's quotes, in both languages) puts a space: before ? ! : ; » €, after «.
 * Keeps "plaisir ? »" or "5 €" from breaking over two lines.
 */
const txt = (p: T2, lang: Lang): string => tr(p, lang).replace(/ (?=[?!:;»€])/g, '\u00a0').replace(/« /g, '«\u00a0');

/**
 * Les bases (Formation): the everyday gestures and words at the counter — greeting, the
 * phone, an unhappy customer, the queue, regulars, goodbye. One chip per topic, the chosen
 * topic as one card (rule, steps, what we say / what we don't). The choice is local state:
 * the first topic shows again each time the screen is opened.
 */
export function BasesView() {
  const { lang } = useApp();
  const [sel, setSel] = useState(BASES[0].id);
  const t = BASES.find(x => x.id === sel) ?? BASES[0];
  const title = navLabel('bases', lang);

  return (
    <section className={s.page}>
      <div className={s.head}>
        <PageTitle>{title}</PageTitle>
        <p className={s.intro}>{txt(B.intro, lang)}</p>
      </div>
      <ChipRow label={txt(B.topics, lang)}>
        {BASES.map(x => (
          <Chip key={x.id} active={x.id === t.id} onClick={() => setSel(x.id)}>{txt(x.chip, lang)}</Chip>
        ))}
      </ChipRow>
      <TopicCard t={t} lang={lang} />
    </section>
  );
}

function TopicCard({ t, lang }: { t: BaseTopic; lang: Lang }) {
  const LO = onbLabels(lang);
  const id = useId();
  return (
    <article className={s.card} aria-labelledby={`${id}-t`}>
      <div className={s.cardHead}>
        <div className={s.thumb}>
          <img src={asset(basesIcon(t.icon))} alt="" className={s.thumbImg} />
        </div>
        <h2 id={`${id}-t`} className={s.title}>{txt(t.title, lang)}</h2>
      </div>

      <div className={s.rule}>
        <span className={s.ruleEyebrow}>{LO.rule}</span>
        <p className={s.ruleText}>{txt(t.rule, lang)}</p>
      </div>

      <div className={s.block}>
        <h3 className={s.h3}>{txt(B.steps, lang)}</h3>
        <ol className={s.steps}>
          {t.steps.map((x, i) => (
            <li key={i} className={s.step}>
              <span className={s.num}>{i + 1}</span>
              <span>{txt(x, lang)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={s.block}>
        <h3 className={s.h3}>{txt(B.say, lang)}</h3>
        <ul className={s.rows}>
          {t.say.map((x, i) => <SayRow key={i} kind="good" text={txt(x, lang)} label={LO.good} />)}
        </ul>
      </div>

      <div className={s.block}>
        <h3 className={s.h3}>{txt(B.avoid, lang)}</h3>
        <ul className={s.rows}>
          {t.avoid.map((x, i) => <SayRow key={i} kind="bad" text={txt(x, lang)} label={LO.bad} />)}
        </ul>
      </div>

      {t.source && <p className={s.source}>{txt(B.source, lang)} · {txt(t.source, lang)}</p>}
    </article>
  );
}

/**
 * "✓ À dire" (abricot) / "✕ À éviter" (muted, struck through) row — same look as the
 * onboarding scripts. The glyph + label tag is hidden from screen readers, which get the
 * label from a visually hidden copy.
 */
function SayRow({ kind, text, label }: { kind: 'bad' | 'good'; text: string; label: string }) {
  const bad = kind === 'bad';
  return (
    <li className={`${s.say} ${bad ? s.bad : s.good}`}>
      <span className={bad ? s.badTag : s.goodTag} aria-hidden="true">{bad ? '✕ ' : '✓ '}{label}</span>
      <span className="sr-only">{`${label}: `}</span>
      <span className={bad ? s.badText : s.goodText}>{withArrows(text)}</span>
    </li>
  );
}

/** The "→" of the livret's mini-dialogues (« … » → « … ») is decorative: hidden from screen readers. */
function withArrows(text: string): ReactNode {
  const parts = text.split('→');
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) => (i ? [<span key={i} aria-hidden="true">→</span>, part] : [part]));
}
