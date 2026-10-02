import { useId, useMemo, useRef } from 'react';
import { PageTitle } from '../../components/PageTitle';
import { useApp } from '../../state/store';
import { alA11y, allergenMatrix } from './allergens.logic';
import s from './AllergensView.module.css';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Allergènes: multi-select of the customer's allergies, live compatible / traces counts,
 * then the product × allergen matrix (status + name columns sticky while scrolling
 * horizontally; incompatible products dimmed), legend and safety note.
 */
export function AllergensView() {
  const { state, lang, L, actions } = useApp();
  const m = useMemo(() => allergenMatrix(lang, state.ex), [lang, state.ex]);
  const a11y = alA11y(lang);
  const introId = useId();
  const chipsRef = useRef<HTMLDivElement>(null);
  /** The button goes away once nothing is excluded: focus moves to the first chip instead of <body>. */
  const reset = () => {
    actions.resetEx();
    chipsRef.current?.querySelector('button')?.focus({ preventScroll: true });
  };

  return (
    <section className={s.page}>
      <PageTitle>{L.alTitle}</PageTitle>

      <div className={s.filter}>
        <div className={s.filterHead}>
          <span id={introId} className={s.intro}>{L.alIntro}</span>
          {m.hasEx && (
            <button type="button" className={s.reset} onClick={reset}>{L.alReset}</button>
          )}
        </div>
        <div ref={chipsRef} className={s.chips} role="group" aria-labelledby={introId}>
          {m.chips.map(c => (
            <button
              key={c.id}
              type="button"
              className={cx(s.chip, c.on && s.chipOn)}
              aria-pressed={c.on}
              onClick={() => actions.toggleAllergen(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {m.hasEx && (
          <div className={s.counts} aria-hidden="true">
            <span><b className={s.okN}>{m.okCount}</b> {L.alOk}</span>
            <span><b className={s.warnN}>{m.warnCount}</b> {L.alWarn}</span>
          </div>
        )}
        {/* Screen-reader copy of the counts: always rendered (out of the flow) so every change is announced. */}
        <p className="sr-only" role="status">
          {m.hasEx ? `${m.okCount} ${L.alOk}, ${m.warnCount} ${L.alWarn}` : ''}
        </p>
      </div>

      {/* Focusable scroller: the cells hold no focusable element, so keyboard users scroll it directly. */}
      <div className={s.matrixCard} role="region" aria-label={L.alTitle} tabIndex={0}>
        <div className={s.grid} role="table" aria-label={L.alTitle}>
          <div className={s.row} role="row">
            <div role="columnheader" aria-label={a11y.status} />
            <div role="columnheader" aria-label={a11y.product} />
            {m.headers.map(h => (
              <div
                key={h.id}
                role="columnheader"
                title={h.name}
                aria-label={h.name}
                className={h.on ? `${s.code} ${s.codeOn}` : s.code}
              >
                {h.code}
              </div>
            ))}
          </div>
          {m.rows.map(r => (
            <div key={r.id} className={s.row} role="row">
              {/* Sticky cells: opaque layer + dimmable inner layer, so scrolled cells never show through. */}
              <div role="cell" className={s.sticky}>
                <div className={cx(s.status, r.bad && s.dim)}>
                  {r.ok && <span className={s.okPill}>OK</span>}
                  {r.warn && <span className={s.warnPill}>{L.trS}</span>}
                  {r.bad && <span className="sr-only">{a11y.bad}</span>}
                </div>
              </div>
              <div role="rowheader" className={`${s.sticky} ${s.stickyName}`}>
                <button type="button" className={cx(s.name, r.bad && s.dim)} onClick={() => actions.openProduct(r.id)}>
                  {r.name}
                </button>
              </div>
              {r.cells.map(c => (
                <div key={c.id} role="cell" className={cx(s.cell, c.on && s.cellOn, r.bad && s.dim)}>
                  {c.contains && <span role="img" aria-label={L.contains} className={s.dot} />}
                  {c.traces && <span role="img" aria-label={L.traces} className={s.ring} />}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={s.legend}>
          <span className={s.legendItem}><span className={s.dot} aria-hidden="true" />{L.contains}</span>
          <span className={s.legendItem}><span className={s.ring} aria-hidden="true" />{L.traces}</span>
        </div>
      </div>

      <p className={s.note}>{L.alNote}</p>
    </section>
  );
}
