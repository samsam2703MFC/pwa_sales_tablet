import type { Lang } from '../data/types';
import { NAV, groupTitle, navLabel, type NavGroup, type View } from '../lib/i18n';

/**
 * Pure chrome logic (prototype `renderVals()` → navItem / tab() / moreGroups).
 */

/** Sidebar entry: active only on its own view AND when there is no search text (`!s.q`, untrimmed). */
export const isNavActive = (id: View, view: View, q: string): boolean => view === id && !q;

export interface NavGroupVM {
  key: NavGroup;
  title: string;
  items: { id: View; label: string }[];
}

/** Sidebar groups "Vente" / "Formation", in sidebar order. */
export const navGroups = (lang: Lang): NavGroupVM[] =>
  (['v', 'f'] as const).map(key => ({
    key,
    title: groupTitle(key, lang),
    items: NAV.filter(d => d[3] === key).map(([id]) => ({ id, label: navLabel(id, lang) })),
  }));

/** Accessible name of the main navigation (sidebar or tab bar). */
export const navAria = (lang: Lang): string => (lang ? 'Navigatie' : 'Navigation');

/** Views that have their own tab in the portrait tab bar. */
export const TAB_IDS: readonly View[] = ['home', 'gamme', 'al', 'faq'];

export type TabId = 'home' | 'gamme' | 'al' | 'faq' | 'more';

/**
 * Tab highlight (prototype `tab()`): "Plus" is active while its sheet is open or when the
 * current view has no tab of its own; the other tabs when their view is shown and the sheet is closed.
 */
export const isTabActive = (id: TabId, view: View, more: boolean): boolean =>
  id === 'more' ? more || !TAB_IDS.includes(view) : view === id && !more;

/** Tab labels: section names, except "FAQ" (literal) and "Plus" / "Meer". */
export const tabLabel = (id: TabId, lang: Lang): string =>
  id === 'more' ? (lang ? 'Meer' : 'Plus') : id === 'faq' ? 'FAQ' : navLabel(id, lang);

export interface MoreGroupVM {
  key: NavGroup;
  title: string;
  /** `img` is a data path (resolve with `asset()`). */
  items: { id: View; label: string; img: string }[];
}

const MORE: readonly (readonly [NavGroup, readonly (readonly [View, string])[]])[] = [
  ['v', [
    ['saisons', 'img/s/autumn-range.png'],
    ['ventes', 'img/p/sandwiches.png'],
    ['svc', 'img/svc/click-collect.png'],
    ['cons', 'img/s/winter-range.png'],
    ['stats', 'img/svc/b2b.png'],
  ]],
  ['f', [['onb', 'img/onb/croissant.png']]],
];

/** Tiles of the "Plus" sheet: the sections without a tab, grouped Vente / Formation. */
export const moreGroups = (lang: Lang): MoreGroupVM[] =>
  MORE.map(([key, items]) => ({
    key,
    title: groupTitle(key, lang),
    items: items.map(([id, img]) => ({ id, label: navLabel(id, lang), img })),
  }));
