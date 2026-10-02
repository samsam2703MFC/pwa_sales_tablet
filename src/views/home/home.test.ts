import { describe, expect, it } from 'vitest';
import { homeModel } from './home.logic';

describe('sample data (prototype golden values)', () => {
  it('assembles the home for October (FR): only the current range', () => {
    const m = homeModel(0, 10);
    expect(m.now.map(x => x.name)).toEqual(['Automne']);
    // Quick asks, onboarding banner, "À préparer" and "Les plus vendus" are no longer on the home page.
    expect(Object.keys(m)).toEqual(['now']);
  });

  it('assembles the home for December (NL)', () => {
    const m = homeModel(1, 12);
    expect(m.now.map(x => x.name)).toEqual(['Sinterklaas', 'Kerst & Nieuwjaar']);
  });
});
