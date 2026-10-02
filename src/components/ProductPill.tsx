import type { ProductCardVM } from '../lib/catalog';
import { useApp } from '../state/store';
import s from './ProductPill.module.css';

/**
 * "Puce-produit": rounded pill with the illustration (a BO photo: in a circle), name and (optionally) price.
 * Opens the product sheet (pushing the navigation stack when already in a sheet).
 *
 * Sizes, as in the prototype:
 * - `lg` — 52 px, image 40, text 16 (home "season of the moment", sheet "Proposez aussi")
 * - `md` — 52 px, image 34, text 15 (season cards)
 * - `sm` — 44 px, image 34, text 15, no price (FAQ linked products)
 */
export function ProductPill({ p, size = 'lg', price = true, hover = false }: {
  p: ProductCardVM;
  size?: 'lg' | 'md' | 'sm';
  price?: boolean;
  /** Ruby Red border on hover (FAQ and product sheet). */
  hover?: boolean;
}) {
  const { actions } = useApp();
  return (
    <button
      type="button"
      className={`${s.pill} ${s[size]}${hover ? ' ' + s.hover : ''}`}
      onClick={() => actions.openProduct(p.id)}
    >
      <img src={p.img} alt="" loading="lazy" decoding="async" className={p.photo ? `${s.img} ${s.round} photo` : s.img} />
      <span className={s.name}>{p.name}</span>
      {price && <span className={s.price}>{p.price}</span>}
    </button>
  );
}

/** Wrapping row of pills. */
export function PillRow({ children, gap = 10 }: { children: React.ReactNode; gap?: 8 | 10 }) {
  return <div className={s.row} style={{ gap }}>{children}</div>;
}
