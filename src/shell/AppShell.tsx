import { useEffect, useRef, type ReactNode } from 'react';
import { ProductDrawer } from '../drawer/ProductDrawer';
import { useApp } from '../state/store';
import { CompactTopBar } from './CompactTopBar';
import { MoreSheet } from './MoreSheet';
import { SearchBar } from './SearchBar';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import s from './AppShell.module.css';

/**
 * App chrome around the current page.
 * - Landscape (≥ 1000 px): grid `256px minmax(0,1fr)` with the sticky left sidebar.
 * - Portrait (< 1000 px): single column, compact top bar in the sticky header,
 *   fixed bottom tab bar and the "Plus" sheet.
 * The product drawer is rendered here, above everything.
 * While the "Plus" sheet is open, the page and the tab bar behind it are inert (modal sheet).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { state, lang, compact } = useApp();
  const sheetOpen = compact && state.more;
  /** The "Plus" tab: focus returns to it when the sheet closes. */
  const moreTab = useRef<HTMLButtonElement>(null);

  // Keep the document language in sync with the FR/NL toggle (screen readers, hyphenation).
  useEffect(() => {
    document.documentElement.lang = lang ? 'nl' : 'fr';
  }, [lang]);

  return (
    <div className={compact ? `${s.app} ${s.compact}` : s.app}>
      {!compact && <Sidebar />}
      <main className={s.main} inert={sheetOpen}>
        <div className={s.top}>
          {compact && <CompactTopBar />}
          <SearchBar />
        </div>
        {children}
      </main>
      {compact && <TabBar moreRef={moreTab} />}
      {sheetOpen && <MoreSheet returnFocus={moreTab} />}
      <ProductDrawer />
    </div>
  );
}
