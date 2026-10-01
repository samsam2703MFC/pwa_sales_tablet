import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { labels } from '../lib/i18n';
import { AppContext, initialState, toTop, transitions, type Actions, type AppContextValue, type AppState, type Patch } from './appState';
import { useWindowWidth } from './useWindowWidth';

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
