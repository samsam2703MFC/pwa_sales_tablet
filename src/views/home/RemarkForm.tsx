import { useEffect, useId, useState } from 'react';
import {
  cleanRemark, localIso, readQueue, REMARK_MAX, REMARK_TYPES, remarksUrl, submitRemark, uuid, type RemarkType,
} from '../../data/remarks';
import { API_ROOT } from '../../lib/api';
import { config, localStore } from '../../lib/config';
import { remarkLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import s from './RemarkForm.module.css';

type Outcome = 'sent' | 'queued' | 'rejected' | 'lost';

/**
 * "Remarque d'un client": the staff types what a customer said (compliment, suggestion or
 * complaint) and sends it to the back-office. Offline, it waits on the tablet and leaves as
 * soon as the network is back (src/data/remarks.ts).
 */
export function RemarkForm() {
  const { lang } = useApp();
  const R = remarkLabels(lang);
  const id = useId();
  const [type, setType] = useState<RemarkType | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [storage] = useState(localStore);
  const [waiting, setWaiting] = useState(() => readQueue(storage).length);

  // The waiting count follows the background sync (src/main.tsx) and the network coming back.
  useEffect(() => {
    const update = () => setWaiting(readQueue(storage).length);
    const timer = setInterval(update, 5000);
    window.addEventListener('online', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', update);
    };
  }, [storage]);

  const clean = cleanRemark(text);
  const canSend = !busy && !!type && !!clean;

  const send = async () => {
    if (busy || !type || !clean) return;
    setBusy(true);
    setOutcome(null);
    const r = await submitRemark(remarksUrl(API_ROOT), {
      id: uuid(), shop: config.shop, type, texte: clean, langue: lang ? 'nl' : 'fr', saisieLe: localIso(new Date()),
    }, storage);
    setBusy(false);
    setOutcome(r);
    setWaiting(readQueue(storage).length);
    if (r === 'sent' || r === 'queued') {
      setText('');
      setType(null);
    }
  };

  return (
    <form className={s.card} onSubmit={e => { e.preventDefault(); void send(); }} aria-labelledby={`${id}-t`}>
      <div className={s.head}>
        <h2 id={`${id}-t`} className={s.title}>{R.title}</h2>
        <span className={s.hint}>{R.hint}</span>
      </div>
      <div className={s.types} role="group" aria-label={R.chooseType}>
        {REMARK_TYPES.map(t => (
          <button
            key={t}
            type="button"
            className={type === t ? `${s.type} ${s.active}` : s.type}
            aria-pressed={type === t}
            onClick={() => { setType(t); setOutcome(null); }}
          >
            {R.types[t]}
          </button>
        ))}
      </div>
      <textarea
        className={s.text}
        rows={3}
        maxLength={REMARK_MAX}
        value={text}
        placeholder={R.placeholder}
        aria-label={R.title}
        onChange={e => { setText(e.target.value); setOutcome(null); }}
      />
      <div className={s.foot}>
        <span className={s.count} aria-hidden="true">{text.length} / {REMARK_MAX}</span>
        <button type="submit" className={s.send} disabled={!canSend}>{busy ? R.sending : R.send}</button>
      </div>
      <p className={outcome === 'rejected' || outcome === 'lost' ? `${s.msg} ${s.err}` : outcome === 'sent' ? s.msg : `${s.msg} ${s.wait}`} role="status">
        {outcome ? R[outcome] : waiting > 0 ? R.waiting(waiting) : ''}
      </p>
    </form>
  );
}
