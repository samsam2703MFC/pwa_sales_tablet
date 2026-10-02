import { useEffect, useState } from 'react';
import { BOOK_SOURCE } from '../../data/book';
import {
  caGauge, crossGauge, fetchObjectives, OBJ_FRESH_MS, objectivesUrl, readStoredObjectives,
  type CaPeriod, type CrossPeriod, type GaugeVM, type Objectives,
} from '../../data/objectives';
import type { Lang } from '../../data/types';
import { API_ROOT } from '../../lib/api';
import { config, localStore } from '../../lib/config';
import { eur } from '../../lib/format';
import { locale, objLabels, type ObjLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import s from './Objectives.module.css';

/**
 * The shop's targets, from the BO: revenue and cross-sell (items per ticket), each for the
 * current week and month, with a gauge (red when reached or ahead of plan, amber otherwise) and, for revenue,
 * a tick where today's expected value sits. The last answer kept on the device shows at once;
 * a fresh one is asked when the block opens (page « Objectifs »). Hidden with the bundled sample
 * data. `eyebrow`: its own "Objectifs" title (off under a page title).
 */
export function ObjectivesBlock({ eyebrow = true }: { eyebrow?: boolean }) {
  const { lang } = useApp();
  const obj = useObjectives(BOOK_SOURCE.kind !== 'sample');
  if (BOOK_SOURCE.kind === 'sample') return null;
  const O = objLabels(lang);
  return (
    <div className={s.block}>
      {eyebrow && <span className={s.eyebrow}>{O.title}</span>}
      <div className={s.grid}>
        <div className={s.card}>
          <h2 className={s.cardTitle}>{O.ca}</h2>
          <CaRow label={O.week} p={obj?.ca.week ?? null} lang={lang} O={O} />
          <CaRow label={O.month} p={obj?.ca.month ?? null} lang={lang} O={O} />
        </div>
        <div className={s.card}>
          <h2 className={s.cardTitle}>{O.cross} · {O.perTicket}</h2>
          <CrossRow label={O.week} p={obj?.cross.week ?? null} lang={lang} O={O} />
          <CrossRow label={O.month} p={obj?.cross.month ?? null} lang={lang} O={O} />
        </div>
      </div>
    </div>
  );
}

/** The kept objectives at once, then the BO's fresh answer (asked again when the page gets visible). */
function useObjectives(enabled: boolean): Objectives | null {
  const [url] = useState(() => objectivesUrl(API_ROOT, config.shop));
  const [storage] = useState(localStore);
  const [kept] = useState(() => readStoredObjectives(url, storage));
  const [obj, setObj] = useState<Objectives | null>(kept?.obj ?? null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let last = kept?.at ?? 0;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < OBJ_FRESH_MS) return;
      last = Date.now();
      void fetchObjectives(url, storage).then(o => { if (alive && o) setObj(o); });
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, url, storage, kept]);

  return obj;
}

/** Items per ticket, e.g. "1,82". */
const perTicket = (n: number, lang: Lang) => n.toLocaleString(locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CaRow({ label, p, lang, O }: { label: string; p: CaPeriod | null; lang: Lang; O: ObjLabels }) {
  const g: GaugeVM = p ? caGauge(p) : { fill: 0, mark: null, state: 'none' };
  const value = p?.done != null ? eur(p.done, lang) : '—';
  const target = p?.target != null ? ` / ${eur(p.target, lang)}` : '';
  const status = !p || p.done == null ? O.noData
    : p.target == null ? O.noTarget
    : g.state === 'reached' ? O.reached
    : g.state === 'ahead' ? `${O.ahead} · ${O.expected} ${eur(p.expected ?? 0, lang)}`
    : g.state === 'behind' ? `${O.behind} · ${O.expected} ${eur(p.expected ?? 0, lang)}`
    : O.toGo;
  return <Row label={label} value={value + target} g={g} status={status} />;
}

function CrossRow({ label, p, lang, O }: { label: string; p: CrossPeriod | null; lang: Lang; O: ObjLabels }) {
  const g: GaugeVM = p ? crossGauge(p) : { fill: 0, mark: null, state: 'none' };
  const value = p?.perTicket != null ? perTicket(p.perTicket, lang) : '—';
  const target = p?.target != null ? ` / ${perTicket(p.target, lang)}` : '';
  const status = !p || p.perTicket == null ? O.noData
    : p.target == null ? O.noTarget
    : g.state === 'reached' ? O.reached : O.toGo;
  const tickets = p?.tickets != null && p.perTicket != null ? ` · ${p.tickets.toLocaleString(locale(lang))} ${O.tickets}` : '';
  return <Row label={label} value={value + target} g={g} status={status + tickets} />;
}

function Row({ label, value, g, status }: { label: string; value: string; g: GaugeVM; status: string }) {
  const good = g.state === 'reached' || g.state === 'ahead';
  return (
    <div className={s.row}>
      <div className={s.rowHead}>
        <span className={s.period}>{label}</span>
        <span className={s.value}>{value}</span>
      </div>
      <div className={s.track} aria-hidden="true">
        {g.state !== 'none' && (
          <div className={good ? `${s.fill} ${s.good}` : s.fill} style={{ width: `${Math.max(g.fill, 2)}%` }} />
        )}
        {g.mark !== null && <span className={s.mark} style={{ left: `${g.mark}%` }} />}
      </div>
      <span className={g.state === 'none' ? s.status : good ? `${s.status} ${s.ok}` : `${s.status} ${s.ko}`}>{status}</span>
    </div>
  );
}
