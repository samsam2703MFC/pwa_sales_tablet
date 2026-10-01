import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { PageTitle } from '../../components/PageTitle';
import { asset } from '../../lib/asset';
import { onbLabels, type OnbLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import {
  livret, moduleCards, modulePage,
  type FullBlockVM, type ModuleCardVM, type ModulePageVM, type ShortVM, type UlItem,
} from './livret.logic';
import s from './OnboardingView.module.css';

/**
 * Onboarding (Formation): the list of the 7 modules, or one module — short version
 * by default (rule, key points, scripts, gain), full livret text on demand.
 * Nothing is remembered (no progress tracking), as in the prototype.
 */
export function OnboardingView() {
  const { state, lang } = useApp();
  const LO = onbLabels(lang);
  const lv = livret(lang);
  const mod = useMemo(() => modulePage(lv, state.onbMod, lang), [lv, state.onbMod, lang]);
  const root = useRef<HTMLElement>(null);
  useMoveFocus(root, mod ? state.onbMod : -1, !!mod && state.onbFull);

  return (
    <section ref={root} className={s.page}>
      {mod ? <ModulePage mod={mod} full={state.onbFull} LO={LO} /> : <ModuleList LO={LO} />}
    </section>
  );
}

/**
 * Keyboard / screen-reader focus after a page change inside the view (the clicked control
 * is usually gone): the module title when a module (or its other version) is shown, the
 * card of the module we came from when back on the list (`onbMod` -1). Focus is left alone
 * when it sits outside the view (e.g. on the sidebar item), and never scrolls (the actions
 * already did). Nothing happens on mount.
 */
function useMoveFocus(root: RefObject<HTMLElement | null>, onbMod: number, full: boolean) {
  const last = useRef({ onbMod, full });
  useEffect(() => {
    const prev = last.current;
    if (prev.onbMod === onbMod && prev.full === full) return;
    last.current = { onbMod, full };
    const el = root.current;
    const active = document.activeElement;
    if (!el || (active && active !== document.body && !el.contains(active))) return;
    const target = el.querySelector<HTMLElement>(onbMod >= 0 ? 'h1' : `[data-module="${prev.onbMod}"]`);
    target?.focus({ preventScroll: true });
  }, [root, onbMod, full]);
}

/* --- List ---------------------------------------------------------------- */

function ModuleList({ LO }: { LO: OnbLabels }) {
  const { lang, actions } = useApp();
  const lv = livret(lang);
  const cards = useMemo(() => moduleCards(lv), [lv]);
  return (
    <>
      <div className={s.listHead}>
        <PageTitle>{LO.title}</PageTitle>
        <p className={s.intro}>{LO.intro}</p>
      </div>
      <div className={s.list}>
        {cards.map(m => <ModuleButton key={m.index} m={m} LO={LO} onOpen={() => actions.openModule(m.index)} />)}
      </div>
      <p className={s.method}>{lv.intro.method}</p>
    </>
  );
}

function ModuleButton({ m, LO, onOpen }: { m: ModuleCardVM; LO: OnbLabels; onOpen: () => void }) {
  return (
    <button type="button" className={s.card} onClick={onOpen} data-module={m.index}>
      <span className={s.thumb}>
        <img src={asset(m.icon)} alt="" loading="lazy" decoding="async" className={s.thumbImg} />
      </span>
      <span className={s.cardText}>
        <span className={s.cardEyebrow}>{m.label} · {LO.readMin}</span>
        <span className={s.cardTitle}>{m.title}</span>
        <span className={s.cardGoal}>{m.goal}</span>
      </span>
      <span className={s.arrow} aria-hidden="true">→</span>
    </button>
  );
}

/* --- Module -------------------------------------------------------------- */

function ModulePage({ mod, full, LO }: { mod: ModulePageVM; full: boolean; LO: OnbLabels }) {
  const { actions } = useApp();
  const { prev, next } = mod;
  return (
    <div className={s.module}>
      <button type="button" className={s.backBtn} onClick={actions.backToModules}>
        <span aria-hidden="true">←</span> {LO.back}
      </button>
      <div className={s.modHead}>
        <div className={s.modThumb}>
          <img src={asset(mod.icon)} alt="" className={s.modThumbImg} />
        </div>
        <div className={s.modTitles}>
          <span className={s.modEyebrow}>{mod.label} · {mod.dur}</span>
          <h1 className={s.modTitle} tabIndex={-1}>{mod.title}</h1>
        </div>
      </div>

      {!full && mod.short && <ShortVersion sh={mod.short} LO={LO} onFull={actions.toggleFull} />}

      {full && (
        <>
          <div className={s.fullBar}>
            <span className={s.fullTag}>{LO.fullTag}</span>
            <button type="button" className={s.link} onClick={actions.toggleFull}>
              <span aria-hidden="true">←</span> {LO.short}
            </button>
          </div>
          <div className={s.fullCard}>
            {mod.blocks.map((b, i) => <Block key={i} b={b} LO={LO} />)}
          </div>
        </>
      )}

      <div className={s.pager}>
        {prev && (
          <button
            type="button" className={s.pagerBtn} onClick={() => actions.openModule(prev.index)}
            aria-label={`${prev.label} (${LO.prev.toLowerCase()})`}
          >
            <span aria-hidden="true">←</span> {prev.label}
          </button>
        )}
        <span className={s.spacer} />
        {next && (
          <button
            type="button" className={s.pagerBtn} onClick={() => actions.openModule(next.index)}
            aria-label={`${next.label} (${LO.next.toLowerCase()})`}
          >
            {next.label} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function ShortVersion({ sh, LO, onFull }: { sh: ShortVM; LO: OnbLabels; onFull: () => void }) {
  return (
    <div className={s.short}>
      <div className={s.readMin}><ClockIcon />{LO.readMin}</div>
      <div className={s.rule}>
        <span className={s.ruleEyebrow}>{LO.rule}</span>
        <p className={s.ruleText}>{sh.rule}</p>
      </div>
      <ul className={s.points}>
        {sh.points.map((p, i) => (
          <li key={i} className={s.point}>
            <span className={s.dot} aria-hidden="true" /><span>{p}</span>
          </li>
        ))}
      </ul>
      {sh.scripts.map((sc, i) => (
        <div key={i} className={s.script}>
          <span className={s.scriptEyebrow}>{LO.scripts} · {sc.ctx}</span>
          {sc.bad != null && <SayRow kind="bad" text={sc.bad} LO={LO} />}
          <SayRow kind="good" text={sc.good} LO={LO} />
        </div>
      ))}
      {sh.gain != null && <p className={s.gain}>{sh.gain}</p>}
      <button type="button" className={`${s.link} ${s.linkStart}`} onClick={onFull}>
        {LO.full} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/**
 * "✕ À éviter" (muted, struck through) / "✓ À dire" (abricot) row — scripts and livret bullets.
 * The tag keeps the prototype's text structure (glyph + label in one element: identical
 * layout); screen readers get its label without the glyph from a visually hidden copy.
 */
function SayRow({ kind, text, LO, as: Tag = 'div' }: { kind: 'bad' | 'good'; text: string; LO: OnbLabels; as?: 'div' | 'li' }) {
  const bad = kind === 'bad';
  const label = bad ? LO.bad : LO.good;
  return (
    <Tag className={`${s.say} ${bad ? s.bad : s.good}`}>
      <span className={bad ? s.badTag : s.goodTag} aria-hidden="true">{bad ? '✕ ' : '✓ '}{label}</span>
      <span className="sr-only">{`${label}: `}</span>
      <span className={bad ? s.badText : s.goodText}>{text}</span>
    </Tag>
  );
}

function UlRow({ it, LO }: { it: UlItem; LO: OnbLabels }) {
  if (it.kind !== 'plain') return <SayRow kind={it.kind} text={it.text} LO={LO} as="li" />;
  return (
    <li className={s.plain}>
      <span className={s.plainDot} aria-hidden="true" /><span>{it.text}</span>
    </li>
  );
}

/** One block of the full livret text. */
function Block({ b, LO }: { b: FullBlockVM; LO: OnbLabels }) {
  switch (b.type) {
    case 'h': return <h2 className={s.h2}>{b.text}</h2>;
    case 'p': return <p className={s.p}>{b.text}</p>;
    case 'gain': return <p className={s.blockGain}>{b.text}</p>;
    case 'ol':
      return (
        <ol className={s.ol}>
          {b.items.map((it, i) => (
            <li key={i} className={s.olItem}>
              <span className={s.num}>{it.n}</span>
              <span>{it.text}</span>
            </li>
          ))}
        </ol>
      );
    case 'ul':
      return (
        <ul className={s.ul}>
          {b.items.map((it, i) => <UlRow key={i} it={it} LO={LO} />)}
        </ul>
      );
    case 'table':
      return (
        <div className={s.tableWrap}>
          <div role="table" className={s.table} style={{ gridTemplateColumns: b.cols, minWidth: b.minW }}>
            <div role="row" className={s.row}>
              {b.head.map((t, i) => <div key={i} role="columnheader" className={s.th}>{t}</div>)}
            </div>
            {b.rows.map((r, ri) => (
              <div key={ri} role="row" className={s.row}>
                {r.map((t, ci) => (t
                  ? <div key={ci} role="cell" className={s.td}>{t}</div>
                  : <div key={ci} role="cell" className={s.tdEmpty}><div className={s.blank} /></div>))}
              </div>
            ))}
          </div>
        </div>
      );
  }
}
