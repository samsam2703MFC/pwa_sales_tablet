import { describe, expect, it } from 'vitest';
import { initialState, transitions, type AppState } from './appState';

const st = (patch: Partial<AppState> = {}): AppState => ({ ...initialState(0), ...patch });

describe('initialState', () => {
  it('starts on the home page, nothing selected, in the requested language', () => {
    expect(initialState(1)).toMatchObject({ view: 'home', lang: 1, q: '', sel: null, stack: [], more: false, onbMod: -1, faqOpen: 0 });
  });
});

describe('transitions.go', () => {
  it('changes section and resets search, sheet, back stack, "Plus" sheet and onboarding module', () => {
    const s = st({ view: 'al', q: 'beurre', sel: 'croissant', stack: ['cookie'], more: true, onbMod: 2 });
    expect(transitions.go('gamme')()).toEqual({ view: 'gamme', q: '', sel: null, stack: [], more: false, onbMod: -1 });
    expect({ ...s, ...transitions.go('gamme')() }).toMatchObject({ view: 'gamme', q: '', sel: null, stack: [], more: false, onbMod: -1 });
  });

  it('applies the extra patch last', () => {
    expect(transitions.go('gamme', { cat: 'vien' })()).toMatchObject({ view: 'gamme', cat: 'vien' });
    expect(transitions.go('onb', { onbMod: 1 })()).toMatchObject({ view: 'onb', onbMod: 1 });
  });
});

describe('transitions.openProduct / back / closeProduct', () => {
  it('opens a product with its FAQ closed and an empty back stack', () => {
    expect(transitions.openProduct('croissant')(st({ selFaq: 3 }))).toEqual({ sel: 'croissant', selFaq: -1, more: false, stack: [] });
  });

  it('pushes the current product on the back stack only for a different product', () => {
    const a = st({ sel: 'croissant' });
    expect(transitions.openProduct('cookie')(a).stack).toEqual(['croissant']);
    expect(transitions.openProduct('croissant')(a).stack).toEqual([]);
    expect(transitions.openProduct('jus')(st({ sel: 'cookie', stack: ['croissant'] })).stack).toEqual(['croissant', 'cookie']);
  });

  it('closes a "Plus" sheet left open (hidden in landscape) so it cannot reappear over the product', () => {
    expect(transitions.openProduct('croissant')(st({ more: true })).more).toBe(false);
  });

  it('back pops the last product, and is a no-op on an empty stack', () => {
    expect(transitions.back()(st({ sel: 'jus', stack: ['croissant', 'cookie'] }))).toEqual({ sel: 'cookie', stack: ['croissant'] });
    expect(transitions.back()(st({ sel: 'jus' }))).toEqual({});
  });

  it('closeProduct clears the selection and the back stack', () => {
    expect(transitions.closeProduct()()).toEqual({ sel: null, stack: [] });
  });
});

describe('small toggles', () => {
  it('toggleAllergen adds then removes an excluded allergen', () => {
    const once = transitions.toggleAllergen('gluten')(st({ ex: ['lait'] }));
    expect(once).toEqual({ ex: ['lait', 'gluten'] });
    expect(transitions.toggleAllergen('gluten')(st(once))).toEqual({ ex: ['lait'] });
  });

  it('toggleSelFaq opens a drawer FAQ, and closes it when tapped again', () => {
    expect(transitions.toggleSelFaq(2)(st())).toEqual({ selFaq: 2 });
    expect(transitions.toggleSelFaq(2)(st({ selFaq: 2 }))).toEqual({ selFaq: -1 });
    expect(transitions.toggleSelFaq(4)(st({ selFaq: 2 }))).toEqual({ selFaq: 4 });
  });

  it('pickSellerRow selects a seller, and goes back to the team when picked again', () => {
    expect(transitions.pickSellerRow('s1')(st())).toEqual({ stSel: 's1' });
    expect(transitions.pickSellerRow('s1')(st({ stSel: 's1' }))).toEqual({ stSel: 'team' });
    expect(transitions.pickSellerRow('s2')(st({ stSel: 's1' }))).toEqual({ stSel: 's2' });
  });

  it('openModule opens an onboarding module in its short version', () => {
    expect(transitions.openModule(3)()).toEqual({ onbMod: 3, onbFull: false });
  });
});
