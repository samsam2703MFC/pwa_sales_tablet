import type { Lang } from '../data/types';
import { useApp } from '../state/store';
import s from './LangToggle.module.css';

const LANGS: readonly (readonly [Lang, string, string])[] = [[0, 'FR', 'fr'], [1, 'NL', 'nl']];

/** FR/NL segmented toggle of the top bar: white pill, active segment Ruby Red (52×40 px). */
export function LangToggle() {
  const { lang, actions } = useApp();
  return (
    <div className={`${s.toggle} ${s.compact}`} role="group" aria-label={lang ? 'Taal' : 'Langue'}>
      {LANGS.map(([l, label, code]) => (
        <button
          key={label}
          type="button"
          lang={code}
          className={l === lang ? `${s.btn} ${s.active}` : s.btn}
          aria-pressed={l === lang}
          onClick={() => actions.setLang(l)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
