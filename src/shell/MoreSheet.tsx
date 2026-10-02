import { useEffect, useRef, type RefObject } from 'react';
import { asset } from '../lib/asset';
import { useApp } from '../state/store';
import { moreGroups, tabLabel } from './shell.logic';
import s from './MoreSheet.module.css';

/**
 * Portrait "Plus" bottom sheet: the sections without a tab, as image tiles.
 * Scrim tap or Escape closes it; focus moves into the sheet, then back to `returnFocus`
 * (the "Plus" tab) when it closes.
 */
export function MoreSheet({ returnFocus }: { returnFocus?: RefObject<HTMLElement | null> }) {
  const { lang, actions } = useApp();
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = returnFocus?.current;
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') actions.closeMore(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [actions, returnFocus]);

  return (
    <div className={s.overlay}>
      <div className={s.scrim} onClick={actions.closeMore} aria-hidden="true" />
      <div ref={sheet} className={s.sheet} role="dialog" aria-modal="true" aria-label={tabLabel('more', lang)} tabIndex={-1}>
        <div className={s.handleRow}><span className={s.handle} /></div>
        {moreGroups(lang).map(g => (
          <div key={g.key} className={s.group}>
            <div className={s.groupTitle}>{g.title}</div>
            <div className={s.grid}>
              {g.items.map(m => (
                <button key={m.id} type="button" className={s.tile} onClick={() => actions.go(m.id)}>
                  <img src={asset(m.img)} alt="" className={s.img} />
                  <span className={s.label}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
