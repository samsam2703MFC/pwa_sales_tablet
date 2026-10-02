import type { ReactNode } from 'react';
import s from './Chip.module.css';

/** Horizontally scrolling filter row (hidden scrollbar, no wrapping). */
export function ChipRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={`noscroll ${s.row}`} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/**
 * Pill filter chip, 52 px high. Active = Ruby Red fill.
 * `size="sm"`: 44 px, for a second row under a first one (active = Ruby Red outline on a pink tint).
 */
export function Chip({ active, onClick, children, size = 'md' }: { active: boolean; onClick: () => void; children: ReactNode; size?: 'md' | 'sm' }) {
  const cls = [s.chip, size === 'sm' && s.sm, active && s.active].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
