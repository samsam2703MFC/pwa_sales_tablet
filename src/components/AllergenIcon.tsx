import { createElement } from 'react';
import { ALLERGEN_ICONS } from './allergenIcons';

/**
 * Pictogram of an allergen (book allergen id), in the current text colour. Decorative: the
 * allergen's name or code is always written next to it. Nothing for an id without a pictogram.
 */
export function AllergenIcon({ id, size = 16, stroke = 2, className }: { id: string; size?: number; stroke?: number; className?: string }) {
  const els = ALLERGEN_ICONS[id];
  if (!els) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {els.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
