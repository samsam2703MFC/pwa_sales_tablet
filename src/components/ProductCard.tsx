import { useId } from 'react';
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
  const id = useId();
  // Announce the name and price first, then the badges and allergen codes (the DOM order is visual).
  const labelledBy = [`${id}-n`, `${id}-p`, `${id}-b`, details && `${id}-d`].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={s.card}
      onClick={() => actions.openProduct(p.id)}
      aria-labelledby={labelledBy}
      aria-describedby={details && p.als.length ? `${id}-a` : undefined}
    >
      <span className={s.media}>
        <img src={p.img} alt="" loading="lazy" decoding="async" className={s.img} />
        <span className={s.badgesL} id={`${id}-b`}>
          {p.seasonal && <span className={s.season}>{p.seasonName}</span>}
          {p.best && <span className={s.best}>{L.top}</span>}
        </span>
        {details && (
          <span className={s.badgesR} id={`${id}-d`}>
            {p.vegan && <span className={s.vegan}>VEGAN</span>}
            {p.vege && <span className={s.vege}>{L.vegeS}</span>}
          </span>
        )}
      </span>
      <span className={s.body}>
        <span className={s.name} id={`${id}-n`}>{p.name}</span>
        <span className={s.priceRow} id={`${id}-p`}>
          <span className={s.price}>{p.price}</span>
          <span className={s.unit}>{p.unit}</span>
        </span>
        {details && (
          <span className={s.codes} id={`${id}-a`}>
            {p.als.map(a => (
              <span key={a} className={s.code}>{a}</span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

/** Responsive grid of product cards (auto-fill, min 210 px). */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className={s.grid}>{children}</div>;
}
