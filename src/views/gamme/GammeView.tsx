import { useMemo } from 'react';
import { Chip, ChipRow } from '../../components/Chip';
import { PageTitle, SectionTitle } from '../../components/PageTitle';
import { ProductCard, ProductGrid } from '../../components/ProductCard';
import { useApp } from '../../state/store';
import { catChips, rangeGroups } from './gamme.logic';
import s from './GammeView.module.css';

/**
 * La gamme: VEGAN toggle + category chips, then one block per category
 * (title, product count, card grid). Empty categories are hidden.
 */
export function GammeView() {
  const { state, lang, L, actions } = useApp();
  const chips = useMemo(() => catChips(lang), [lang]);
  const groups = useMemo(() => rangeGroups(state.cat, state.vegan, lang), [state.cat, state.vegan, lang]);

  return (
    <section className={s.page}>
      <PageTitle>{L.gammeTitle}</PageTitle>
      <ChipRow label={L.gammeTitle}>
        {/* Accessible name stays "VEGAN"; the on state is carried by aria-pressed. */}
        <button
          type="button"
          className={state.vegan ? `${s.vegan} ${s.veganOn}` : s.vegan}
          aria-pressed={state.vegan}
          onClick={actions.toggleVegan}
        >
          VEGAN{state.vegan && <span aria-hidden="true"> ✕</span>}
        </button>
        <span className={s.sep} aria-hidden="true" />
        {chips.map(c => (
          <Chip key={c.id} active={state.cat === c.id} onClick={() => actions.setCat(c.id)}>
            {c.label}
          </Chip>
        ))}
      </ChipRow>
      {groups.map(g => (
        <div key={g.id} className={s.group}>
          <div className={s.head}>
            <SectionTitle>{g.name}</SectionTitle>
            <span className={s.count}>{g.count}</span>
          </div>
          <ProductGrid>
            {g.items.map(p => <ProductCard key={p.id} p={p} />)}
          </ProductGrid>
        </div>
      ))}
    </section>
  );
}
