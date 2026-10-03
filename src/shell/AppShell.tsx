import { useEffect, useRef, type ReactNode } from 'react';
import { ProductDrawer } from '../drawer/ProductDrawer';
import { PRODUCTS } from '../lib/catalog';
import { useApp } from '../state/store';
import { CompactTopBar } from './CompactTopBar';
import { MoreSheet } from './MoreSheet';
import { SearchBar } from './SearchBar';
import { TabBar } from './TabBar';
import s from './AppShell.module.css';

/**
 * App chrome around the current page, the same in both orientations (shop request: the menu
 * lives in the footer on the tablet, no left sidebar): single column, compact top bar in the
 * sticky header, fixed bottom tab bar and the "Plus" sheet. Only the product sheet still
 * depends on the width (side panel in landscape, bottom sheet in portrait).
 * The product drawer is rendered here, above everything.
 * Modal sheets: while the "Plus" sheet is open, the page and the tab bar behind it are inert;
 * while the product sheet is open, the page and the tab bar are.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { state, lang } = useApp();
  const sheetOpen = state.more;
  /** Same condition as ProductDrawer (an unknown id shows nothing). */
  const drawerOpen = !!state.sel && !!PRODUCTS[state.sel];
  /** The "Plus" tab: focus returns to it when the sheet closes. */
  const moreTab = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lastView = useRef(state.view);

  // Keep the document language in sync with the FR/NL toggle (screen readers, hyphenation).
  useEffect(() => {
    document.documentElement.lang = lang ? 'nl' : 'fr';
  }, [lang]);

  // After a section change, if the control that triggered it went away with the old page
  // (focus fell back to <body>: home tiles, onboarding banner), move focus to the new page
  // title without scrolling (go() already scrolled to the top). Tab bar buttons
  // keep their focus; the "Plus" sheet gives it back to its tab first (its cleanup runs before
  // this effect). Compared with the previous view rather than a "first run" flag, which
  // StrictMode's double effect run would defeat.
  useEffect(() => {
    if (lastView.current === state.view) return;
    lastView.current = state.view;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const h1 = mainRef.current?.querySelector<HTMLElement>('h1');
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [state.view]);

  return (
    <div className={`${s.app} ${s.compact}`}>
      <main ref={mainRef} className={s.main} inert={sheetOpen || drawerOpen}>
        <div className={s.top}>
          <CompactTopBar />
          <SearchBar />
        </div>
        {children}
      </main>
      <TabBar moreRef={moreTab} inert={drawerOpen} />
      {sheetOpen && <MoreSheet returnFocus={moreTab} />}
      <ProductDrawer />
    </div>
  );
}
