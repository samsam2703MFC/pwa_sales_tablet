/**
 * Inline SVG icons of the chrome, copied from the prototype (stroke 1.6, decorative → aria-hidden).
 */

/** Search field loupe, 18 px, stroke #666. */
export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.6" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

const tab = { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const;

/** Tab bar: house. */
export function HomeIcon() {
  return (
    <svg {...tab} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4 10.5L12 4l8 6.5V20h-5v-6h-6v6H4z" />
    </svg>
  );
}

/** Tab bar: 2×2 grid. */
export function GridIcon() {
  return (
    <svg {...tab} fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/** Tab bar: shield with exclamation mark. */
export function ShieldIcon() {
  return (
    <svg {...tab} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
      <path d="M12 8v5M12 16v.5" />
    </svg>
  );
}

/** Tab bar: speech bubble with question mark. */
export function BubbleIcon() {
  return (
    <svg {...tab} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M10 9a2 2 0 114 0c0 1.2-2 1.4-2 2.6M12 13.5v.2" />
    </svg>
  );
}

/** Tab bar: three dots. */
export function DotsIcon() {
  return (
    <svg {...tab} fill="currentColor">
      <circle cx="5.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.5" cy="12" r="1.7" />
    </svg>
  );
}
