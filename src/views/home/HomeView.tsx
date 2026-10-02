import { useMemo } from 'react';
import { PillRow, ProductPill } from '../../components/ProductPill';
import { currentMonth } from '../../lib/date';
import { useApp } from '../../state/store';
import type { SeasonVM } from '../../lib/seasons';
import { BundlesWeek } from './Bundles';
import { homeModel } from './home.logic';
import s from './HomeView.module.css';

/**
 * Accueil: the current range (season(s) of the moment, with their products) and the network's
 * bundles of the week. The shop's targets and the customer remark form have their own pages
 * (« Objectifs », « Remarques clients », in the "Plus" sheet).
 */
export function HomeView() {
  const { L, lang } = useApp();
  const month = currentMonth();
  const m = useMemo(() => homeModel(lang, month), [lang, month]);

  return (
    <section className={s.page}>
      <h1 className={s.h1}>{L.hello}</h1>

      <section className={s.range} aria-labelledby="home-range">
        <h2 id="home-range" className={s.eyebrow}>{L.curRange}</h2>
        {m.now.length > 0
          ? m.now.map(x => <SeasonNow key={x.id} season={x} />)
          : <p className={s.empty}>{L.noSeasonNow}</p>}
      </section>

      <BundlesWeek />
    </section>
  );
}

/** "En ce moment" card: illustration, dates, name, instruction and the season's products. */
function SeasonNow({ season: x }: { season: SeasonVM }) {
  const { L } = useApp();
  const titleId = `home-season-${x.id}`;
  return (
    <article className={s.season} aria-labelledby={titleId}>
      <img src={x.img} alt="" className={s.seasonImg} />
      <div className={s.seasonBody}>
        <div className={s.seasonMeta}>
          <span className={s.badge}>{L.now}</span>
          <span className={s.dates}>{x.dates}</span>
        </div>
        <h3 id={titleId} className={s.h2}>{x.name}</h3>
        {x.tip && (
          <div className={s.tip}>
            <span className={s.tipLabel}>{L.tipL}</span>
            <span>{x.tip}</span>
          </div>
        )}
        {x.products.length > 0 && (
          <PillRow>
            {x.products.map(p => <ProductPill key={p.id} p={p} size="lg" />)}
          </PillRow>
        )}
      </div>
    </article>
  );
}
