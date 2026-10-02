import { useMemo, useRef, type MouseEvent } from 'react';
import { todayLabel } from '../lib/date';
import { useApp } from '../state/store';
import { resultsSummary, search } from '../views/search/search.logic';
import { SearchIcon } from './icons';
import s from './SearchBar.module.css';

/**
 * Header row: pill search field ("Effacer" while there is text) and, in landscape only,
 * today's date (capitalised by CSS). Holds the live region announcing the number of results
 * (always mounted, so screen readers announce each change).
 */
export function SearchBar() {
  const { state, lang, L, compact, actions } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const hasQ = !!state.q.trim();
  const res = useMemo(() => search(state.q), [state.q]);
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
          onKeyDown={e => {
            // The keyboard's "Search" key (enterKeyHint) does nothing by default: results already
            // filter live. Blur to close the on-screen keyboard so the results (and, on iOS, the
            // tab bar) become visible. No <form>: no extra DOM level nor submit/navigation.
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
          }}
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
      {/* Out of the flow (.sr-only is absolute): no effect on the row's layout. */}
      <p className="sr-only" role="status">{hasQ ? resultsSummary(res, lang, L.noRes) : ''}</p>
    </header>
  );
}
