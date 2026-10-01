import { useRef, type MouseEvent } from 'react';
import { todayLabel } from '../lib/date';
import { useApp } from '../state/store';
import { SearchIcon } from './icons';
import s from './SearchBar.module.css';

/**
 * Header row: pill search field ("Effacer" while there is text) and, in landscape only,
 * today's date (capitalised by CSS).
 */
export function SearchBar() {
  const { state, lang, L, compact, actions } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const hasQ = !!state.q.trim();
  const clear = (e: MouseEvent) => {
    actions.clearQ();
    // The button disappears. From the keyboard (Enter/Space → detail 0), keep the focus in the
    // field instead of losing it; on a tap, leave focus alone as the prototype does, so the
    // tablet's on-screen keyboard does not pop up.
    if (e.detail === 0) input.current?.focus();
  };
  return (
    <header className={s.header}>
      <div className={s.field} role="search">
        <SearchIcon />
        <input
          ref={input}
          type="text"
          className={s.input}
          value={state.q}
          onChange={e => actions.setQ(e.target.value)}
          placeholder={L.search}
          aria-label={L.search}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {hasQ && (
          <button type="button" className={s.clear} onClick={clear}>{L.clear}</button>
        )}
      </div>
      {!compact && <div className={s.today}>{todayLabel(lang)}</div>}
    </header>
  );
}
