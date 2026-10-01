import { asset } from '../lib/asset';
import { useApp } from '../state/store';
import { LangToggle } from './LangToggle';
import { isNavActive, navAria, navGroups } from './shell.logic';
import s from './Sidebar.module.css';

/** Landscape (≥ 1000 px) sticky left column: logo, grouped navigation, FR/NL toggle, sample-data note. */
export function Sidebar() {
  const { state, lang, L, actions } = useApp();
  return (
    <aside className={s.aside}>
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
        <div className={s.sample}>{L.sample}</div>
      </div>
    </aside>
  );
}
