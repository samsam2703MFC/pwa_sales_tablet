import { useMemo } from 'react';
import { PillRow, ProductPill } from '../../components/ProductPill';
import { SectionTitle } from '../../components/PageTitle';
import { asset } from '../../lib/asset';
import { currentMonth } from '../../lib/date';
import { onbLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import type { SeasonVM } from '../../lib/seasons';
import { homeModel, ONB_MODULES } from './home.logic';
import s from './HomeView.module.css';

/**
 * Accueil: greeting, "Le client demande…" shortcuts (each opens a pre-filtered section),
 * onboarding banner, season(s) of the moment, next season to prepare, best sellers.
 * Blocks with nothing to show (no season, no best seller, empty instruction) are left out.
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

      <button type="button" className={s.onb} onClick={() => actions.go('onb')}>
        {/* spans, not divs: a <button> only allows phrasing content (display set in CSS) */}
        <span className={s.onbThumb}>
          <img src={asset('img/onb/croissant.png')} alt="" />
        </span>
        <span className={s.onbText}>
          <span className={s.onbEyebrow}>Onboarding</span>
          <span className={s.onbTitle}>{onbLabels(lang).homeT(ONB_MODULES)}</span>
        </span>
        <span className={s.onbArrow} aria-hidden="true">→</span>
      </button>

      {m.now.map(x => <SeasonNow key={x.id} season={x} />)}

      {m.next && (
        <div className={s.next}>
          <img src={m.next.img} alt="" className={s.nextImg} />
          <div className={s.nextText}>
            <span className={s.nextEyebrow}>{L.next} · {m.next.name}{m.next.dates && <> · {m.next.dates}</>}</span>
            {m.next.tip && <span className={s.nextTip}>{m.next.tip}</span>}
          </div>
        </div>
      )}

      {m.best.length > 0 && (
        <div className={s.best}>
          <SectionTitle>{L.best}</SectionTitle>
          <div className={s.bestGrid}>
            {m.best.map(p => (
              <button key={p.id} type="button" className={s.bestTile} onClick={() => actions.openProduct(p.id)}>
                <img src={p.img} alt="" loading="lazy" decoding="async" className={s.bestImg} />
                <span className={s.bestName}>{p.name}</span>
                <span className={s.bestPrice}>{p.price}</span>
              </button>
            ))}
          </div>
        </div>
      )}
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
