import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Period } from '../data/types';
import { config } from '../lib/config';
import { labels, type Labels, type View } from '../lib/i18n';
import { useWindowWidth } from './useWindowWidth';

/**
 * Global UI state — mirrors the prototype's single component state.
 * Nothing is persisted (no localStorage), on purpose.
 */
export interface AppState {
  view: View;
  lang: Lang;
  /** Search text ('' = normal view). */
  q: string;
  /** Range filter: 'all' | category id. */
  cat: string;
  vegan: boolean;
  /** Excluded allergen ids (allergen matrix). */
  ex: string[];
  faqCat: string;
  /** Index (in BOOK.faq) of the open FAQ answer, -1 = none. */
  faqOpen: number;
  /** Product shown in the drawer. */
  sel: string | null;
  /** Product ids to go back to from the drawer. */
  stack: string[];
  /** Index (in BOOK.faq) of the FAQ open inside the drawer, -1 = none. */
  selFaq: number;
  /** 'team' | seller id. */
  stSel: string;
  stPer: Period;
  /** Onboarding module index, -1 = list. */
  onbMod: number;
  onbFull: boolean;
  /** "Plus" sheet (portrait). */
  more: boolean;
}

export const initialState = (lang: Lang = config.defaultLang): AppState => ({
  view: 'home', lang, q: '', cat: 'all', vegan: false, ex: [], faqCat: 'all', faqOpen: 0,
  sel: null, stack: [], selFaq: -1, stSel: 'team', stPer: 'week', onbMod: -1, onbFull: false, more: false,
});

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

const toTop = () => {
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
};

/** Pure transitions, exported for unit tests. */
export const transitions = {
  /** Change section: resets search, drawer, "Plus" sheet and onboarding module. */
  go: (view: View, extra?: Partial<AppState>) => (): Partial<AppState> => ({
    view, q: '', sel: null, stack: [], more: false, onbMod: -1, ...extra,
  }),
  /** Open a product; pushes the current one on the back stack. */
  openProduct: (id: string) => (s: AppState): Partial<AppState> => ({
    sel: id, selFaq: -1, stack: s.sel && s.sel !== id ? [...s.stack, s.sel] : s.stack,
  }),
  closeProduct: () => (): Partial<AppState> => ({ sel: null, stack: [] }),
  back: () => (s: AppState): Partial<AppState> =>
    s.stack.length ? { sel: s.stack[s.stack.length - 1], stack: s.stack.slice(0, -1) } : {},
  toggleAllergen: (id: string) => (s: AppState): Partial<AppState> => ({
    ex: s.ex.includes(id) ? s.ex.filter(e => e !== id) : [...s.ex, id],
  }),
  setFaqCat: (id: string) => (): Partial<AppState> => ({ faqCat: id, faqOpen: -1 }),
  toggleFaq: (i: number) => (s: AppState): Partial<AppState> => ({ faqOpen: s.faqOpen === i ? -1 : i }),
  toggleSelFaq: (i: number) => (s: AppState): Partial<AppState> => ({ selFaq: s.selFaq === i ? -1 : i }),
  /** Ranking row: select the seller, or back to the team if already selected. */
  pickSellerRow: (id: string) => (s: AppState): Partial<AppState> => ({ stSel: s.stSel === id ? 'team' : id }),
  openModule: (i: number) => (): Partial<AppState> => ({ onbMod: i, onbFull: false }),
};

export interface Actions {
  /** Low-level merge, like the prototype's setState. */
  set: (patch: Patch) => void;
  go: (view: View, extra?: Partial<AppState>) => void;
  setLang: (lang: Lang) => void;
  setQ: (q: string) => void;
  clearQ: () => void;
  setCat: (cat: string) => void;
  toggleVegan: () => void;
  toggleAllergen: (id: string) => void;
  resetEx: () => void;
  setFaqCat: (id: string) => void;
  toggleFaq: (i: number) => void;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  back: () => void;
  toggleSelFaq: (i: number) => void;
  setStSel: (id: string) => void;
  pickSellerRow: (id: string) => void;
  setStPer: (p: Period) => void;
  openModule: (i: number) => void;
  backToModules: () => void;
  toggleFull: () => void;
  toggleMore: () => void;
  closeMore: () => void;
}

export interface AppContextValue {
  state: AppState;
  actions: Actions;
  lang: Lang;
  /** Interface labels in the current language. */
  L: Labels;
  /** Window width < 1000 px → portrait layout (tab bar, bottom sheets). */
  compact: boolean;
  width: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, initial }: { children: ReactNode; initial?: Partial<AppState> }) {
  const [state, setState] = useState<AppState>(() => ({ ...initialState(), ...initial }));
  const width = useWindowWidth();
  const compact = width < 1000;

  const set = useCallback((patch: Patch) => {
    setState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const actions = useMemo<Actions>(() => ({
    set,
    go: (view, extra) => { set(transitions.go(view, extra)); toTop(); },
    setLang: lang => set({ lang }),
    setQ: q => set({ q }),
    clearQ: () => set({ q: '' }),
    setCat: cat => set({ cat }),
    toggleVegan: () => set(s => ({ vegan: !s.vegan })),
    toggleAllergen: id => set(transitions.toggleAllergen(id)),
    resetEx: () => set({ ex: [] }),
    setFaqCat: id => set(transitions.setFaqCat(id)),
    toggleFaq: i => set(transitions.toggleFaq(i)),
    openProduct: id => set(transitions.openProduct(id)),
    closeProduct: () => set(transitions.closeProduct()),
    back: () => set(transitions.back()),
    toggleSelFaq: i => set(transitions.toggleSelFaq(i)),
    setStSel: id => set({ stSel: id }),
    pickSellerRow: id => set(transitions.pickSellerRow(id)),
    setStPer: p => set({ stPer: p }),
    openModule: i => { set(transitions.openModule(i)); toTop(); },
    backToModules: () => { set({ onbMod: -1 }); toTop(); },
    toggleFull: () => { set(s => ({ onbFull: !s.onbFull })); toTop(); },
    toggleMore: () => set(s => ({ more: !s.more })),
    closeMore: () => set({ more: false }),
  }), [set]);

  const value = useMemo<AppContextValue>(() => ({
    state, actions, lang: state.lang, L: labels(state.lang), compact, width,
  }), [state, actions, compact, width]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
