import { asset } from '../lib/asset';
import { useApp } from '../state/store';
import { LangToggle } from './LangToggle';
import s from './CompactTopBar.module.css';

/** Portrait (< 1000 px) top row, inside the sticky header: logo + "Book vendeuses" + FR/NL toggle. */
export function CompactTopBar() {
  const { L } = useApp();
  return (
    <div className={s.bar}>
      <div className={s.brand}>
        <img src={asset('img/logo.png')} alt="L'Atelier By" className={s.logo} />
        <span className={s.book}>{L.book}</span>
      </div>
      <LangToggle variant="compact" />
    </div>
  );
}
