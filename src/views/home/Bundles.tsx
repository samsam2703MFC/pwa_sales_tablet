import { useId } from 'react';
import { BOOK_SOURCE } from '../../data/book';
import { config } from '../../lib/config';
import { now } from '../../lib/date';
import { bundleLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import { bundleWeek } from './bundles.logic';
import s from './Bundles.module.css';

/**
 * "Les bundles de la semaine": the network's bundles running this week in this shop, as a
 * Monday → Sunday table (slot of each day, today's column lit), with what the customer gets and
 * the network price. Before the period, the weekly pattern and "Dès le …"; hidden after it.
 */
export function BundlesWeek() {
  const { lang } = useApp();
  const id = useId();
  const L = bundleLabels(lang);
  const shop = BOOK_SOURCE.shop?.id ?? config.shop;
  const w = bundleWeek(now(), shop, lang);
  if (!w) return null;

  return (
    <div className={s.block}>
      <div className={s.head}>
        <h2 id={`${id}-t`} className={s.eyebrow}>{L.title}</h2>
        {w.start && <span className={s.start}>{w.start}</span>}
        <span className={s.period}>{w.period}</span>
      </div>
      <div className={s.card} role="region" aria-labelledby={`${id}-t`} tabIndex={0}>
        <table className={s.table} aria-labelledby={`${id}-t`}>
          <thead>
            <tr>
              <th scope="col" className={s.corner}><span className="sr-only">{L.bundle}</span></th>
              {w.days.map(d => (
                <th key={d.n} scope="col" className={d.today ? `${s.day} ${s.today}` : s.day}>
                  <span className={s.dayName}>{d.label}</span>
                  {d.date && <span className={s.dayDate}>{d.date}</span>}
                  {d.today && <span className="sr-only"> ({L.today})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {w.rows.map(r => (
              <tr key={r.id}>
                <th scope="row" className={s.bundle}>
                  <span className={s.nameRow}>
                    <span className={`${s.dot} ${s[r.section]}`} aria-hidden="true" />
                    <span className={s.name}>{r.name}</span>
                    <span className={s.price}>{r.price}</span>
                  </span>
                  <span className={s.content}>{r.content}</span>
                  {(r.channel || r.note) && (
                    <span className={s.meta}>
                      {r.channel && <span className={s.channel}>{r.channel}</span>}
                      {r.note && <span className={s.note}>{r.note}</span>}
                    </span>
                  )}
                </th>
                {r.cells.map((c, i) => (
                  <td key={i} className={w.days[i].today ? `${s.cell} ${s.today}` : s.cell}>
                    {c && <span className={`${s.slot} ${s[r.section]}`}>{c}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
