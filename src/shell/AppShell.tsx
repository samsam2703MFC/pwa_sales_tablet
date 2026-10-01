import type { ReactNode } from 'react';
import { ProductDrawer } from '../drawer/ProductDrawer';

/** TODO: app chrome (sidebar / compact header, search, tab bar, "Plus" sheet). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <main>{children}</main>
      <ProductDrawer />
    </div>
  );
}
