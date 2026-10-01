import { useMemo } from 'react';
import { ProductCard, ProductGrid } from '../../components/ProductCard';
import { toCard, tr } from '../../lib/catalog';
import { useApp } from '../../state/store';
import { search } from './search.logic';
import s from './SearchView.module.css';

/** Search results (shown instead of the current section as soon as the query is not blank). */
export function SearchView() {
  const { state, lang, L } = useApp();
  const res = useMemo(() => search(state.q), [state.q]);
  const none = !res.products.length && !res.faq.length;
  return (
    <section className={s.section}>
      <h1 className={s.title}>{L.results} « {state.q} »</h1>
      {none && <p className={s.none} role="status">{L.noRes}</p>}
      {res.products.length > 0 && (
        <ProductGrid>
          {res.products.map(p => <ProductCard key={p.id} p={toCard(p, lang)} details={false} />)}
        </ProductGrid>
      )}
      {res.faq.length > 0 && (
        <div className={s.faq}>
          <h2 className={s.eyebrow}>{L.questions}</h2>
          {res.faq.map(({ f, i }) => (
            <div key={i} className={s.card}>
              <div className={s.q}>{tr(f.q, lang)}</div>
              <div className={s.a}>{tr(f.a, lang)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
