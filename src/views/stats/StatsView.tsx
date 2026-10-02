import { useId, useMemo } from 'react';
import { Chip, ChipRow } from '../../components/Chip';
import { PageTitle, SectionTitle } from '../../components/PageTitle';
import { statsLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import { STATS_ARE_SAMPLE, statsA11y, statsView } from './stats.logic';
import s from './StatsView.module.css';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Statistiques: period selector + seller chips, 4 KPI cards (objective progress),
 * 7-day revenue chart, top 5 products (open the product sheet) and the team
 * ranking table (tap a row to filter on that seller, tap again for the team).
 * Sample figures only — to be connected to the till (banner "Données d'exemple").
 */
export function StatsView() {
  const { state, lang, actions } = useApp();
  const LS = statsLabels(lang);
  const a11y = statsA11y(lang);
  const vm = useMemo(() => statsView(lang, state.stSel, state.stPer), [lang, state.stSel, state.stPer]);
  const chartId = useId();
  const topId = useId();
  const rankId = useId();

  return (
    <section className={s.page}>
      <div className={s.head}>
        <div className={s.titles}>
          <PageTitle>{LS.title}</PageTitle>
          <span className={s.note}>{LS.note}</span>
        </div>
        <div className={s.periods} role="group" aria-label={a11y.period}>
          {vm.periods.map(p => (
            <button
              key={p.id}
              type="button"
              className={cx(s.period, p.active && s.periodOn)}
              aria-pressed={p.active}
              onClick={() => actions.setStPer(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {STATS_ARE_SAMPLE && (
        <p className={s.sample}>
          <span className={s.sampleTitle}>{LS.sample}</span>
          <span>{LS.sampleText}</span>
        </p>
      )}

      <ChipRow label={a11y.sellers}>
        {vm.sellers.map(c => (
          <Chip key={c.id} active={c.active} onClick={() => actions.setStSel(c.id)}>{c.label}</Chip>
        ))}
      </ChipRow>

      <div className={s.kpis}>
        {vm.kpis.map(k => (
          <div key={k.id} className={s.kpi}>
            <span className={s.eyebrow}>{k.label}</span>
            <span className={s.value}>{k.value}</span>
            {k.pct != null && (
              <div className={s.track}>
                <div className={cx(s.fill, !!k.hit && s.fillHit)} style={{ width: k.pct + '%' }} />
              </div>
            )}
            <div className={s.kpiFoot}>
              <span>{k.sub}</span>
              {k.hit === true && <span className={s.hit}>{LS.reached}</span>}
              {k.hit === false && <span className={s.miss}>{LS.toGo}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className={s.duo}>
        <div className={s.panel}>
          <span id={chartId} className={s.eyebrow}>{LS.ca} · {LS.days}</span>
          <ul className={s.chart} aria-labelledby={chartId}>
            {vm.days.map(d => (
              <li key={d.label} className={s.day}>
                <span className={s.dayValue}>{d.value}</span>
                <div className={cx(s.bar, d.last && s.barLast)} style={{ height: d.pct + '%' }} aria-hidden="true" />
                <span className={s.dayLabel}>{d.label}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Empty when the sample top lists name no product of the BO book. */}
        {vm.top.length > 0 && (
          <div className={cx(s.panel, s.topPanel)} role="group" aria-labelledby={topId}>
            <span id={topId} className={cx(s.eyebrow, s.topTitle)}>{LS.top}</span>
            {vm.top.map(t => (
              <button key={t.product.id} type="button" className={s.topItem} onClick={() => actions.openProduct(t.product.id)}>
                <span className={s.topRank}>{t.rank}</span>
                <img src={t.product.img} alt="" loading="lazy" decoding="async" className={t.product.photo ? `${s.topImg} ${s.topImgPhoto} photo` : s.topImg} />
                <span className={s.topName}>{t.product.name}</span>
                <span className={s.topQty}>{t.qtyLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={s.rankBlock}>
        <SectionTitle><span id={rankId}>{LS.rank}</span></SectionTitle>
        <div className={s.rankCard} role="table" aria-labelledby={rankId}>
          <div className={s.rankHead} role="row">
            <span role="columnheader" aria-label={a11y.rankCol} />
            <span role="columnheader">{LS.seller}</span>
            <span role="columnheader" className={s.num}>{LS.ca}</span>
            <span role="columnheader" className={s.num}>{LS.pan}</span>
            <span role="columnheader" className={s.num}>{LS.cross}</span>
            <span role="columnheader" className={s.num}>{LS.sais}</span>
          </div>
          {vm.rank.map(r => (
            // Pointer taps anywhere on the line land here; the name button's own click bubbles up.
            <div key={r.id} className={cx(s.row, r.on && s.rowOn)} role="row" onClick={() => actions.pickSellerRow(r.id)}>
              <span role="cell" className={s.rank}>{r.rank}</span>
              <span role="rowheader" className={s.name}>
                <button type="button" className={s.pick} aria-pressed={r.on}>
                  {r.name}
                </button>
              </span>
              <span role="cell" className={s.num}>{r.ca}</span>
              <span role="cell" className={s.num}>{r.pan}</span>
              <span role="cell" className={cx(s.num, r.crossHit ? s.crossHit : s.crossMiss)}>{r.cross}</span>
              <span role="cell" className={s.num}>{r.saison}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
