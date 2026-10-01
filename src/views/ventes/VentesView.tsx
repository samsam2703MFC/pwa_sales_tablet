import { useMemo } from 'react';
import { PageTitle, SectionTitle } from '../../components/PageTitle';
import { useApp } from '../../state/store';
import { combos, pairs, reflexes } from './ventes.logic';
import s from './VentesView.module.css';

/**
 * Vendre plus: "Formules" (combo cards with product tiles), "Les bons réflexes"
 * (numbered abricot cards) and "Associations par produit" (one row per product:
 * name → cross-sell products, sentence to say).
 */
export function VentesView() {
  const { lang, L, actions } = useApp();
  const vm = useMemo(() => ({ combos: combos(lang), reflexes: reflexes(lang), pairs: pairs(lang) }), [lang]);

  return (
    <section className={s.page}>
      <PageTitle>{L.ventesTitle}</PageTitle>

      <div className={s.block}>
        <SectionTitle>{L.combos}</SectionTitle>
        <div className={s.combos}>
          {vm.combos.map(c => (
            <div key={c.name} className={s.combo}>
              <div className={s.comboHead}>
                <div className={s.comboTitle}>
                  <span className={s.comboName}>{c.name}</span>
                  <span className={s.comboWhen}>{c.when}</span>
                </div>
                <span className={s.comboPrice}>{c.price}</span>
              </div>
              <div className={s.tiles}>
                {c.items.map(m => (
                  <button key={m.id} type="button" className={s.tile} title={m.name} onClick={() => actions.openProduct(m.id)}>
                    <img src={m.img} alt="" loading="lazy" decoding="async" className={s.tileImg} />
                    <span className={s.tileName}>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={s.block}>
        <SectionTitle>{L.reflexes}</SectionTitle>
        {/* role="list": Safari/VoiceOver drops list semantics when list-style is none. */}
        <ol className={s.reflexes} role="list">
          {vm.reflexes.map(r => (
            <li key={r.n} className={s.reflex}>
              <span className={s.reflexN}>{r.n}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={s.block}>
        <SectionTitle>{L.pairs}</SectionTitle>
        <div className={s.list}>
          {vm.pairs.map(r => (
            <div key={r.id} className={s.pair}>
              <button type="button" className={s.name} onClick={() => actions.openProduct(r.id)}>{r.name}</button>
              <span className={s.cross}>→ {r.cross}</span>
              <span className={s.line}>« {r.line} »</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
