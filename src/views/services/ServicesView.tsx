import { useMemo } from 'react';
import { PageTitle } from '../../components/PageTitle';
import { useApp } from '../../state/store';
import { serviceCards } from './services.logic';
import s from './ServicesView.module.css';

/**
 * Services: one card per service — illustration + name, "how it works", lead time,
 * and the sentence to say to the customer at the bottom.
 */
export function ServicesView() {
  const { lang, L } = useApp();
  const services = useMemo(() => serviceCards(lang), [lang]);

  return (
    <section className={s.page}>
      <PageTitle>{L.svcTitle}</PageTitle>
      <div className={s.grid}>
        {services.map(x => (
          <div key={x.id} className={s.card}>
            <div className={s.head}>
              <img src={x.img} alt="" className={s.img} />
              <h2 className={s.name}>{x.name}</h2>
            </div>
            <div className={s.field}>
              <span className={s.eyebrow}>{L.how}</span>
              <span className={s.value}>{x.how}</span>
            </div>
            <div className={s.field}>
              <span className={s.eyebrow}>{L.delay}</span>
              <span className={`${s.value} ${s.delay}`}>{x.delay}</span>
            </div>
            <div className={s.say}>« {x.say} »</div>
          </div>
        ))}
      </div>
    </section>
  );
}
