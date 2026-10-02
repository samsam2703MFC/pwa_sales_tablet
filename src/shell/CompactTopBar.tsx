import { BOOK_SOURCE } from '../data/book';
import { asset } from '../lib/asset';
import { useApp } from '../state/store';
import { LangToggle } from './LangToggle';
import { sourceLabel } from './shell.logic';
import s from './CompactTopBar.module.css';

/**
 * Portrait (< 1000 px) top row, inside the sticky header: logo + "Book vendeuses" + data source
 * ("Données d'exemple", "BO · <shop> · <date>"…) + FR/NL toggle.
 */
export function CompactTopBar() {
  const { L, lang } = useApp();
  return (
    <div className={s.bar}>
      <div className={s.brand}>
        <img src={asset('img/logo.png')} alt="L'Atelier By" className={s.logo} />
        <span className={s.book}>{L.book}</span>
        <span className={s.source}>{sourceLabel(BOOK_SOURCE, lang)}</span>
      </div>
      <LangToggle variant="compact" />
    </div>
  );
}
