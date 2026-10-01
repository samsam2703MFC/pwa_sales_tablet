import type { Lang } from '../data/types';
import { useApp } from '../state/store';
import s from './LangToggle.module.css';

const LANGS: readonly (readonly [Lang, string, string])[] = [[0, 'FR', 'fr'], [1, 'NL', 'nl']];

/**
 * FR/NL segmented toggle.
 * - `sidebar`: beige pill, active segment white with Ruby Red text (36 px).
 * - `compact`: white pill, active segment Ruby Red (52×40 px).
 */
export function LangToggle({ variant }: { variant: 'sidebar' | 'compact' }) {
  const { lang, actions } = useApp();
  return (
    <div className={`${s.toggle} ${s[variant]}`} role="group" aria-label={lang ? 'Taal' : 'Langue'}>
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
