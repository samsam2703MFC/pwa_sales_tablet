import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SAMPLE_BOOK } from '../data/book';
import { AllergenIcon } from './AllergenIcon';
import { ALLERGEN_ICONS } from './allergenIcons';

afterEach(cleanup);

describe('AllergenIcon', () => {
  it('every allergen of the book has a pictogram, and only those', () => {
    expect(Object.keys(ALLERGEN_ICONS).sort()).toEqual(SAMPLE_BOOK.allergens.map(a => a.id).sort());
  });

  it('draws a decorative 24 × 24 line icon in the text colour, at the asked size', () => {
    const { container } = render(<AllergenIcon id="gluten" size={20} stroke={1.75} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect([svg.getAttribute('width'), svg.getAttribute('stroke'), svg.getAttribute('stroke-width'), svg.getAttribute('fill')]).toEqual(['20', 'currentColor', '1.75', 'none']);
    expect(svg.querySelectorAll('path')).toHaveLength(ALLERGEN_ICONS.gluten.length);
  });

  it('nothing for an id without a pictogram', () => {
    const { container } = render(<AllergenIcon id="ghost" />);
    expect(container.innerHTML).toBe('');
  });
});
