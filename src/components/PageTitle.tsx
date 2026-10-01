import type { ReactNode } from 'react';
import s from './PageTitle.module.css';

/** Page H1 — Vank 38 px uppercase (the standard section title of every page). */
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={className ? `${s.h1} ${className}` : s.h1}>{children}</h1>;
}

/** Section H2 — Vank 24 px uppercase (line-height inherited from body, as in the prototype). */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={className ? `${s.h2} ${className}` : s.h2}>{children}</h2>;
}
