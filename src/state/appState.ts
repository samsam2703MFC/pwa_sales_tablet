import { createContext, useContext } from 'react';
import type { Lang, Period } from '../data/types';
import { config } from '../lib/config';
import type { Labels, View } from '../lib/i18n';

/**
 * Global UI state — mirrors the prototype's single component state.
 * None of it is persisted, on purpose: every launch starts from the home page. The app keeps
 * only its data on the device: the shop id (`?shop=`, localStorage `bv.shop`, src/lib/config.ts)
 * and the last BO book received (localStorage `bv.book`, src/data/remote.ts).
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
  /** FAQ sub-category chip under `faqCat` ('all' = every question of the category). */
  faqSub: string;
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
  view: 'home', lang, q: '', cat: 'all', vegan: false, ex: [], faqCat: 'all', faqSub: 'all', faqOpen: 0,
  sel: null, stack: [], selFaq: -1, stSel: 'team', stPer: 'week', onbMod: -1, onbFull: false, more: false,
});

export type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

export const toTop = () => {
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
};

/** Pure transitions, exported for unit tests. */
export const transitions = {
  /** Change section: resets search, drawer, "Plus" sheet and onboarding module. */
  go: (view: View, extra?: Partial<AppState>) => (): Partial<AppState> => ({
    view, q: '', sel: null, stack: [], more: false, onbMod: -1, ...extra,
  }),
  /**
   * Open a product; pushes the current one on the back stack. Also closes the "Plus"
   * sheet: one left open in portrait is only hidden in landscape, and would otherwise
   * come back on top of (and under) the product sheet when the tablet rotates back.
   */
  openProduct: (id: string) => (s: AppState): Partial<AppState> => ({
    sel: id, selFaq: -1, more: false, stack: s.sel && s.sel !== id ? [...s.stack, s.sel] : s.stack,
  }),
  closeProduct: () => (): Partial<AppState> => ({ sel: null, stack: [] }),
  back: () => (s: AppState): Partial<AppState> =>
    s.stack.length ? { sel: s.stack[s.stack.length - 1], stack: s.stack.slice(0, -1) } : {},
  toggleAllergen: (id: string) => (s: AppState): Partial<AppState> => ({
    ex: s.ex.includes(id) ? s.ex.filter(e => e !== id) : [...s.ex, id],
  }),
  setFaqCat: (id: string) => (): Partial<AppState> => ({ faqCat: id, faqSub: 'all', faqOpen: -1 }),
  setFaqSub: (id: string) => (): Partial<AppState> => ({ faqSub: id, faqOpen: -1 }),
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
  setFaqSub: (id: string) => void;
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
  /** Layout viewport narrower than 1000 px → portrait layout (tab bar, bottom sheets). */
  compact: boolean;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
