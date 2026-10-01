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

/** Pill filter chip, 52 px high. Active = Ruby Red fill. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={active ? `${s.chip} ${s.active}` : s.chip} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
