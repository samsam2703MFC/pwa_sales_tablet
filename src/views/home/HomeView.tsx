import { useMemo } from 'react';
import { PillRow, ProductPill } from '../../components/ProductPill';
import { currentMonth } from '../../lib/date';
import { useApp } from '../../state/store';
import type { SeasonVM } from '../../lib/seasons';
import { homeModel } from './home.logic';
import { ObjectivesBlock } from './Objectives';
import { RemarkForm } from './RemarkForm';
import s from './HomeView.module.css';

/**
 * Accueil: greeting, the shop's targets (revenue and cross-sell, week and month, from the BO),
 * "Le client demande…" shortcuts (each opens a pre-filtered section), the customer remark
 * form, and the season(s) of the moment. Blocks with nothing to show are left out.
 */
export function HomeView() {
  const { L, lang, actions } = useApp();
  const month = currentMonth();
  const m = useMemo(() => homeModel(lang, month), [lang, month]);

  return (
    <section className={s.page}>
      <div className={s.intro}>
        <h1 className={s.h1}>{L.hello}</h1>
        <p className={s.lead}>{L.homeIntro}</p>
      </div>

      <ObjectivesBlock />

      <div className={s.asks}>
        <span id="home-asks" className={s.eyebrow}>{L.asks}</span>
        <div className={s.askGrid} role="group" aria-labelledby="home-asks">
          {m.quick.map(a => (
            <button key={a.id} type="button" className={s.ask} onClick={() => actions.go(a.view, a.extra)}>
              <span className={s.askLabel}>{a.label}</span>
              <span className={s.askSub}>{a.sub} <span aria-hidden="true">→</span></span>
            </button>
          ))}
        </div>
      </div>

      <RemarkForm />

      {m.now.map(x => <SeasonNow key={x.id} season={x} />)}
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
        <h2 id={titleId} className={s.h2}>{x.name}</h2>
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
