import { useMemo } from 'react';
import { PageTitle } from '../../components/PageTitle';
import { PillRow, ProductPill } from '../../components/ProductPill';
import { currentMonth } from '../../lib/date';
import { useApp } from '../../state/store';
import { calendarRows, currentSeasonCards, monthHeaders, type SeasonCardVM } from './saisons.logic';
import s from './SaisonsView.module.css';

/**
 * Saisons: 12-month calendar (one row per season, current month highlighted; scrolls
 * horizontally on narrow screens), then one full-width card per season running this month,
 * with its instruction and products (the other seasons are only in the calendar).
 */
export function SaisonsView() {
  const { lang, L } = useApp();
  const month = currentMonth();
  const months = useMemo(() => monthHeaders(lang, month), [lang, month]);
  const rows = useMemo(() => calendarRows(lang, month), [lang, month]);
  const cards = useMemo(() => currentSeasonCards(lang, month), [lang, month]);

  return (
    <section className={s.page}>
      <PageTitle>{L.calTitle}</PageTitle>

      {rows.length > 0 && (
        <div className={s.calCard}>
          <div className={s.cal} role="table" aria-label={L.calTitle}>
            <div className={s.row} role="row">
              {/* Corner cell: names the season column for screen readers. */}
              <div role="columnheader" className={s.corner}><span className="sr-only">{L.calTitle}</span></div>
              {months.map(m => (
                <div
                  key={m.month}
                  role="columnheader"
                  className={m.current ? `${s.month} ${s.monthNow}` : s.month}
                  aria-current={m.current ? 'date' : undefined}
                >
                  {m.label}
                </div>
              ))}
            </div>
            {rows.map(r => (
              <div key={r.id} className={s.row} role="row">
                <div role="rowheader" className={s.name}>{r.name}</div>
                {r.cells.map((c, i) => (
                  <div key={i} role="cell" className={c.current ? `${s.cell} ${s.cellNow}` : s.cell}>
                    {c.on && <div className={s.bar}><span className="sr-only">{months[i].label}</span></div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length > 0 ? (
        <div className={s.cards}>
          {cards.map(x => <SeasonCard key={x.id} season={x} />)}
        </div>
      ) : (
        <p className={s.empty}>{L.noSeasonNow}</p>
      )}
    </section>
  );
}

/**
 * Season card, full width: illustration on the left, then name (+ "En ce moment"), dates,
 * instruction and the season's product pills, which wrap across the whole width.
 */
function SeasonCard({ season: x }: { season: SeasonCardVM }) {
  const { L } = useApp();
  return (
    <div className={s.card}>
      <img src={x.img} alt="" className={s.cardImg} />
      <div className={s.cardBody}>
        <div className={s.cardText}>
          <div className={s.titleRow}>
            {/* h2 for the outline (cards sit right under the H1). */}
            <h2 className={s.cardTitle}>{x.name}</h2>
            {x.isNow && <span className={s.now}>{L.now}</span>}
          </div>
          <span className={s.dates}>{x.dates}</span>
        </div>
        {x.tip && (
          <div className={s.tip}>
            <span className={s.tipL}>{L.tipL} · </span>
            {x.tip}
          </div>
        )}
        {x.products.length > 0 && (
          <PillRow gap={8}>
            {x.products.map(p => <ProductPill key={p.id} p={p} size="md" />)}
          </PillRow>
        )}
      </div>
    </div>
  );
}
