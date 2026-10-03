import { useId } from 'react';
import { BOOK_SOURCE } from '../data/book';
import type { ProductCardVM } from '../lib/catalog';
import { useApp } from '../state/store';
import { AllergenIcon } from './AllergenIcon';
import s from './ProductCard.module.css';

/**
 * Product card of the range grid ("La gamme"). The whole card opens the product sheet.
 * `details` = diet badge (top right) + allergen codes with their pictograms; the search results
 * grid omits them, as in the prototype.
 *
 * With a BO book the picture area is square: a photo fills it, an illustration (or the
 * placeholder) sits in the middle; the sample data keeps the prototype's 140 px band.
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
      aria-describedby={details && (p.als.length || p.alUnknown) ? `${id}-a` : undefined}
    >
      <span className={BOOK_SOURCE.kind === 'sample' ? s.media : `${s.media} ${s.square}`}>
        <img src={p.img} alt="" loading="lazy" decoding="async" className={p.photo ? `${s.img} photo` : s.img} />
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
            {p.als.map((a, i) => (
              <span key={a} className={s.code}>
                <AllergenIcon id={p.alIds[i]} size={14} className={s.codeIcon} />
                {a}
              </span>
            ))}
            {/* Unverified allergen list (BO data): no codes must not read as "no allergen". */}
            {p.alUnknown && <span className={s.unk}>{L.alCheck}</span>}
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
