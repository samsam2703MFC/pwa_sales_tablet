import { useId, useMemo } from 'react';
import { Chip, ChipRow } from '../../components/Chip';
import { PageTitle } from '../../components/PageTitle';
import { PillRow, ProductPill } from '../../components/ProductPill';
import { useApp } from '../../state/store';
import { faqChips, faqItems, faqSubChips } from './faq.logic';
import s from './FaqView.module.css';

/**
 * FAQ clients: category chips (picking one closes the open answer), a second row of smaller
 * chips when the category has sub-categories (the product families under "Produits"), then an accordion
 * where only one answer is open at a time — the first question starts open.
 * Answers may list the linked products as pills that open the product sheet.
 */
export function FaqView() {
  const { state, lang, L, actions } = useApp();
  const uid = useId();
  const chips = useMemo(() => faqChips(lang), [lang]);
  const subs = useMemo(() => faqSubChips(state.faqCat, lang), [state.faqCat, lang]);
  const sub = subs.some(c => c.id === state.faqSub) ? state.faqSub : 'all';
  const items = useMemo(() => faqItems(state.faqCat, sub, state.faqOpen, lang), [state.faqCat, sub, state.faqOpen, lang]);
  const catLabel = chips.find(c => c.id === state.faqCat)?.label;

  return (
    <section className={s.page}>
      <PageTitle>{L.faqTitle}</PageTitle>
      <div className={s.filters}>
        <ChipRow label={L.faqTitle}>
          {chips.map(c => (
            <Chip key={c.id} active={state.faqCat === c.id} onClick={() => actions.setFaqCat(c.id)}>
              {c.label}
            </Chip>
          ))}
        </ChipRow>
        {subs.length > 0 && (
          <ChipRow label={catLabel}>
            {subs.map(c => (
              <Chip key={c.id} size="sm" active={sub === c.id} onClick={() => actions.setFaqSub(c.id)}>
                {c.label}
              </Chip>
            ))}
          </ChipRow>
        )}
      </div>
      <div className={s.list}>
        {items.map(f => {
          const panel = `${uid}-a${f.index}`;
          return (
            <div key={f.index} className={s.item}>
              <h2 className={s.heading}>
                <button
                  type="button"
                  className={s.head}
                  aria-expanded={f.open}
                  aria-controls={panel}
                  onClick={() => actions.toggleFaq(f.index)}
                >
                  <span>{f.q}</span>
                  <span className={s.sign} aria-hidden="true">{f.sign}</span>
                </button>
              </h2>
              <div id={panel} className={s.answer} hidden={!f.open}>
                <div className={s.text}>{f.a}</div>
                {f.hasProds && (
                  <div className={s.linked}>
                    <span className={s.eyebrow}>{L.linkedP}</span>
                    <PillRow gap={8}>
                      {/* Keyed by position: hand-entered data may repeat an id. */}
                      {f.prods.map((m, i) => <ProductPill key={i + '-' + m.id} p={m} size="sm" price={false} hover />)}
                    </PillRow>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
