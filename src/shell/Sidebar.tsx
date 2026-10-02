import { BOOK_SOURCE } from '../data/book';
import { asset } from '../lib/asset';
import { useApp } from '../state/store';
import { LangToggle } from './LangToggle';
import { isNavActive, navAria, navGroups, sourceLabel } from './shell.logic';
import s from './Sidebar.module.css';

/**
 * Landscape (≥ 1000 px) sticky left column: logo, grouped navigation, FR/NL toggle, data-source
 * note (the prototype's sample-data sentence, or where the BO data comes from).
 * `inert` while the product sheet (modal) is open.
 */
export function Sidebar({ inert }: { inert?: boolean }) {
  const { state, lang, L, actions } = useApp();
  return (
    <aside className={s.aside} inert={inert}>
      <div className={s.brand}>
        <img src={asset('img/logo.png')} alt="L'Atelier By" className={s.logo} />
        <div className={s.book}>{L.book}</div>
      </div>
      <nav className={s.nav} aria-label={navAria(lang)}>
        {navGroups(lang).map(g => (
          <div key={g.key} className={s.group}>
            <div className={s.groupTitle}>{g.title}</div>
            {g.items.map(n => {
              const active = isNavActive(n.id, state.view, state.q);
              return (
                <button
                  key={n.id}
                  type="button"
                  className={active ? `${s.item} ${s.active}` : s.item}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => actions.go(n.id)}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={s.foot}>
        <LangToggle variant="sidebar" />
        <div className={s.sample}>{sourceLabel(BOOK_SOURCE, lang, true)}</div>
      </div>
    </aside>
  );
}
