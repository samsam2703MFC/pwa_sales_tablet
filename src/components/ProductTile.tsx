import type { ProductCardVM } from '../lib/catalog';
import { useApp } from '../state/store';
import s from './ProductTile.module.css';

/**
 * Product tile of the home page's current range: a rounded rectangle with the picture (a BO
 * photo fills its rounded square, an illustration sits in it), the name and the price. Opens
 * the product sheet. Laid out two per row by the caller (`ProductTiles`).
 */
export function ProductTile({ p }: { p: ProductCardVM }) {
  const { actions } = useApp();
  return (
    <button type="button" className={s.tile} onClick={() => actions.openProduct(p.id)}>
      <span className={s.thumb}>
        <img src={p.img} alt="" loading="lazy" decoding="async" className={p.photo ? `${s.img} photo` : s.img} />
      </span>
      <span className={s.text}>
        <span className={s.name}>{p.name}</span>
        {(p.price || p.unit) && (
          <span className={s.priceRow}>
            {p.price && <span className={s.price}>{p.price}</span>}
            {p.unit && <span className={s.unit}>{p.unit}</span>}
          </span>
        )}
      </span>
    </button>
  );
}

/** Two tiles per row. */
export function ProductTiles({ children, label }: { children: React.ReactNode; label?: string }) {
  return <div className={s.grid} role="group" aria-label={label}>{children}</div>;
}
