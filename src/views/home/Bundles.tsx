import { useId } from 'react';
import { BOOK_SOURCE } from '../../data/book';
import { config } from '../../lib/config';
import { now } from '../../lib/date';
import { bundleLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import { bundleWeek, type BundleRowVM } from './bundles.logic';
import s from './Bundles.module.css';

/**
 * "Les bundles de la semaine": the network's bundles running this week in this shop, as rounded
 * cards two per row — name and network price, what the customer gets, the days of the week
 * (today ringed), when in words, click & collect / delivery, and "Aujourd'hui" when it runs
 * today. Before the period, the weekly pattern and "Dès le …"; hidden after it.
 */
export function BundlesWeek() {
  const { lang } = useApp();
  const id = useId();
  const L = bundleLabels(lang);
  const shop = BOOK_SOURCE.shop?.id ?? config.shop;
  const w = bundleWeek(now(), shop, lang);
  if (!w) return null;
  const todayIdx = w.days.findIndex(d => d.today);

  return (
    <section className={s.block} aria-labelledby={`${id}-t`}>
      <div className={s.head}>
        <h2 id={`${id}-t`} className={s.eyebrow}>{L.title}</h2>
        {w.start && <span className={s.start}>{w.start}</span>}
        <span className={s.period}>{w.period}</span>
      </div>
      <ul className={s.grid}>
        {w.rows.map(r => <BundleCard key={r.id} r={r} todayIdx={todayIdx} />)}
      </ul>
    </section>
  );
}

function BundleCard({ r, todayIdx }: { r: BundleRowVM; todayIdx: number }) {
  const { lang } = useApp();
  const L = bundleLabels(lang);
  const id = useId();
  return (
    <li className={s.item}>
      <article className={`${s.card} ${s[r.section]}`} aria-labelledby={`${id}-n`}>
        <div className={s.top}>
          <h3 id={`${id}-n`} className={s.name}>{r.name}</h3>
          <span className={s.price}>{r.price}</span>
        </div>
        <p className={s.content}>{r.content}</p>
        <div className={s.days} aria-hidden="true">
          {r.cells.map((c, i) => (
            <span key={i} className={[s.day, c && s.on, i === todayIdx && s.isToday].filter(Boolean).join(' ')}>
              {L.initials[i]}
            </span>
          ))}
        </div>
        <p className={s.when}>{r.when}</p>
        {(r.today || r.channel || r.note) && (
          <div className={s.meta}>
            {r.today && <span className={s.today}>{L.today} · {r.today}</span>}
            {r.channel && <span className={s.channel}>{r.channel}</span>}
            {r.note && <span className={s.note}>{r.note}</span>}
          </div>
        )}
      </article>
    </li>
  );
}
