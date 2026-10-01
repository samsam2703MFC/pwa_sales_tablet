import { useMemo } from 'react';
import { PageTitle } from '../../components/PageTitle';
import { useApp } from '../../state/store';
import { consGroups } from './conservation.logic';
import s from './ConservationView.module.css';

/**
 * Conservation & DLC: per category, one row per product — name (opens the sheet),
 * shelf life in red, storage advice.
 */
export function ConservationView() {
  const { lang, L, actions } = useApp();
  const groups = useMemo(() => consGroups(lang), [lang]);

  return (
    <section className={s.page}>
      <PageTitle>{L.consTitle}</PageTitle>
      {groups.map(g => (
        <div key={g.id} className={s.group}>
          <h2 className={s.title}>{g.name}</h2>
          <div className={s.list}>
            {g.rows.map(r => (
              <div key={r.id} className={s.row}>
                <button type="button" className={s.name} onClick={() => actions.openProduct(r.id)}>{r.name}</button>
                <span className={s.dlc}>{r.dlc}</span>
                <span className={s.keep}>{r.keep}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
