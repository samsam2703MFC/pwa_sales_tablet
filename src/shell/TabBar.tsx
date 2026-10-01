import type { ReactNode, Ref } from 'react';
import { useApp } from '../state/store';
import { BubbleIcon, DotsIcon, GridIcon, HomeIcon, ShieldIcon } from './icons';
import { isTabActive, navAria, tabLabel, type TabId } from './shell.logic';
import s from './TabBar.module.css';

const TABS: readonly (readonly [TabId, () => ReactNode])[] = [
  ['home', HomeIcon],
  ['gamme', GridIcon],
  ['al', ShieldIcon],
  ['faq', BubbleIcon],
  ['more', DotsIcon],
];

/**
 * Portrait fixed bottom tab bar: Accueil, La gamme, Allergènes, FAQ, Plus (toggles the sheet).
 * Inert while the sheet is open (the sheet covers it). `moreRef` receives the "Plus" button.
 */
export function TabBar({ moreRef }: { moreRef?: Ref<HTMLButtonElement> }) {
  const { state, lang, actions } = useApp();
  return (
    <nav className={s.bar} aria-label={navAria(lang)} inert={state.more}>
      {TABS.map(([id, Icon]) => {
        const on = isTabActive(id, state.view, state.more);
        const isMore = id === 'more';
        return (
          <button
            key={id}
            ref={isMore ? moreRef : undefined}
            type="button"
            className={on ? `${s.tab} ${s.on}` : s.tab}
            aria-current={!isMore && on ? 'page' : undefined}
            aria-expanded={isMore ? state.more : undefined}
            aria-haspopup={isMore ? 'dialog' : undefined}
            onClick={isMore ? actions.toggleMore : () => actions.go(id)}
          >
            <Icon />
            {tabLabel(id, lang)}
          </button>
        );
      })}
    </nav>
  );
}
