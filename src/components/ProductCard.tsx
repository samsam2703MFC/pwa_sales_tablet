import type { ProductCardVM } from '../lib/catalog';
import { useApp } from '../state/store';
import s from './ProductCard.module.css';

/**
 * Product card of the range grid ("La gamme"). The whole card opens the product sheet.
 * `details` = diet badge (top right) + allergen codes; the search results grid omits them,
 * as in the prototype.
 */
export function ProductCard({ p, details = true }: { p: ProductCardVM; details?: boolean }) {
  const { L, actions } = useApp();
  return (
    <button type="button" className={s.card} onClick={() => actions.openProduct(p.id)}>
      <div className={s.media}>
        <img src={p.img} alt="" loading="lazy" decoding="async" className={s.img} />
        <div className={s.badgesL}>
          {p.seasonal && <span className={s.season}>{p.seasonName}</span>}
          {p.best && <span className={s.best}>{L.top}</span>}
        </div>
        {details && (
          <div className={s.badgesR}>
            {p.vegan && <span className={s.vegan}>VEGAN</span>}
            {p.vege && <span className={s.vege}>{L.vegeS}</span>}
          </div>
        )}
      </div>
      <div className={s.body}>
        <div className={s.name}>{p.name}</div>
        <div className={s.priceRow}>
          <span className={s.price}>{p.price}</span>
          <span className={s.unit}>{p.unit}</span>
        </div>
        {details && (
          <div className={s.codes}>
            {p.als.map(a => (
              <span key={a} className={s.code}>{a}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/** Responsive grid of product cards (auto-fill, min 210 px). */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className={s.grid}>{children}</div>;
}
