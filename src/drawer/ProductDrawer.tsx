import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { PillRow, ProductPill } from '../components/ProductPill';
import { PRODUCTS } from '../lib/catalog';
import { useApp } from '../state/store';
import { backName, isCloseSwipe, sheetVM, type AllergenState } from './drawer.logic';
import { AllergenIcon } from '../components/AllergenIcon';
import s from './ProductDrawer.module.css';

/** Accessible name prefix of the "← previous product" button (the arrow itself is decorative). */
const BACK_TO = ['Retour à', 'Terug naar'] as const;

const TILE: Record<AllergenState, string> = { contains: s.contains, traces: s.traces, absent: s.absent };

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Product sheet ("fiche produit"), shown above everything when a product is selected.
 * Landscape: right side panel min(640px,100%), full height, slides in from the right.
 * Portrait: bottom sheet 94dvh (94vh fallback) with a handle, slides up.
 * Closes on the scrim, the "Fermer" button, Escape, or a swipe on the header
 * (down > 70 px in portrait, right > 80 px in landscape, that axis dominating:
 * a diagonal scroll on the header does not close it).
 */
export function ProductDrawer() {
  const { state } = useApp();
  if (!state.sel || !PRODUCTS[state.sel]) return null;
  return <Sheet />;
}

function Sheet() {
  const { state, actions, lang, L, compact } = useApp();
  const vm = useMemo(() => sheetVM(state.sel, state.selFaq, lang), [state.sel, state.selFaq, lang]);
  const back = backName(state.stack, lang);
  const panel = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  // The opener, read once while rendering: by the time an effect runs, the page behind is
  // already inert (AppShell), which takes the focus away from it.
  const [trigger] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

  // Open: Escape closes, background scroll is locked; on close, focus returns to the trigger
  // (the page is no longer inert by then: React updates the DOM before running this cleanup).
  useEffect(() => {
    const root = document.documentElement;
    const { overflow, scrollbarGutter } = root.style;
    // Desktop browsers with a classic scrollbar: keep its room so the page behind does not shift.
    if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') actions.closeProduct(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      root.style.overflow = overflow;
      root.style.scrollbarGutter = scrollbarGutter;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [actions, trigger]);

  // Every product shown starts at the top of the sheet.
  useLayoutEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [state.sel]);

  // Keep focus inside the dialog (on open, and when the focused pill/back button goes away).
  useEffect(() => {
    const el = panel.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, [state.sel]);

  if (!vm) return null;

  /** Tab / Shift+Tab cycle inside the dialog. */
  const trapTab = (e: KeyboardEvent) => {
    const el = panel.current;
    if (e.key !== 'Tab' || !el) return;
    const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (e.shiftKey && (active === first || active === el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = swipe.current;
    if (!start) return;
    swipe.current = null;
    const t = e.changedTouches[0];
    if (isCloseSwipe(compact, t.clientX - start.x, t.clientY - start.y)) actions.closeProduct();
  };

  return (
    <div className={compact ? `${s.overlay} ${s.compact}` : s.overlay} onKeyDown={trapTab}>
      <div className={s.scrim} onClick={actions.closeProduct} aria-hidden="true" />
      {/* The prototype's <article>: a div, since ARIA in HTML does not allow role="dialog" on <article>. */}
      <div
        ref={panel}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={s.header} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {compact && <div className={s.handleRow}><span className={s.handle} /></div>}
          <div className={s.bar}>
            <div className={s.lead}>
              {state.stack.length > 0 && (
                <button type="button" className={s.back} onClick={actions.back} aria-label={`${BACK_TO[lang]} ${back}`}>
                  ← {back}
                </button>
              )}
              <span className={s.cat}>{vm.cat}</span>
            </div>
            <button type="button" className={s.close} onClick={actions.closeProduct}>{L.close}</button>
          </div>
        </div>

        <div className={s.body}>
          <div className={s.hero}>
            <div className={s.tile}>
              {/* Keyed by picture: a fallback (data-fallback) never carries over to the next product. */}
              <img key={vm.img} src={vm.img} alt="" className={vm.photo ? `${s.tileImg} ${s.tilePhoto} photo` : s.tileImg} />
            </div>
            <div className={s.heroText}>
              <h2 id={titleId} className={s.name}>{vm.name}</h2>
              {(vm.price || vm.unit) && (
                <div className={s.priceRow}>
                  <span className={s.price}>{vm.price}</span>
                  <span className={s.unit}>{vm.unit}</span>
                </div>
              )}
              <div className={s.badges}>
                <span className={`${s.badge} ${s.avail}`}>{vm.avail}</span>
                {vm.vegan && <span className={`${s.badge} ${s.vegan}`}>VEGAN</span>}
                {vm.vege && <span className={`${s.badge} ${s.vege}`}>{L.vege}</span>}
                {vm.best && <span className={`${s.badge} ${s.best}`}>{L.top}</span>}
              </div>
            </div>
          </div>

          {/* BO products may come without these texts yet: empty blocks are left out. */}
          {vm.pitch && (
            <div className={s.say}>
              <h3 className={s.sayLabel}>{L.say}</h3>
              <span className={s.pitch}>« {vm.pitch} »</span>
            </div>
          )}

          {vm.desc && <p className={s.desc}>{vm.desc}</p>}

          <div className={s.allergens}>
            <div className={s.alHead}>
              <h3 className={s.eyebrow}>{L.alg}</h3>
              {vm.grid.length > 0 && (
                <span className={s.legend}>
                  <span className={s.legendItem}><span className={s.dot} aria-hidden="true" />{L.contains}</span>
                  <span className={s.legendItem}><span className={s.ring} aria-hidden="true" />{L.traces}</span>
                </span>
              )}
            </div>
            {!vm.alKnown && (
              <div className={s.alCheck}>
                <strong className={s.alCheckTitle}>{L.alCheck}</strong>
                <span>{L.alUnkText}</span>
                {vm.alRaw && <span className={s.alRaw}>{L.alRawL} {vm.alRaw}</span>}
              </div>
            )}
            {vm.grid.length > 0 && (
              <ul className={s.alGrid}>
                {vm.grid.map(a => (
                  <li key={a.id} className={`${s.al} ${TILE[a.state]}`}>
                    <AllergenIcon id={a.id} size={18} stroke={1.75} className={s.alIcon} />
                    {a.n}
                    {a.state !== 'absent' && (
                      <span className="sr-only">: {a.state === 'contains' ? L.contains : L.traces}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {vm.alKnown && !vm.trKnown && <p className={s.trUnk}>{L.trUnk}</p>}
          </div>

          {vm.ingr && (
            <div className={s.ingredients}>
              <h3 className={s.eyebrow}>{L.ingr}</h3>
              <span className={s.ingr}>{vm.ingr}</span>
            </div>
          )}

          <div className={s.keepBlock}>
            <div className={s.keepCol}>
              <h3 className={s.eyebrow}>{L.dlc}</h3>
              <span className={s.dlc}>{vm.dlc}</span>
            </div>
            {/* Always shown, like the shelf life: staff must see when the BO has nothing yet. */}
            <div className={s.keepCol}>
              <h3 className={s.eyebrow}>{L.keep}</h3>
              <span className={vm.keep ? s.keep : `${s.keep} ${s.keepNone}`}>{vm.keep || L.keepNone}</span>
            </div>
          </div>

          {vm.faq.length > 0 && (
            <div className={s.faqList}>
              <h3 className={s.eyebrow}>{L.selFaqT}</h3>
              {vm.faq.map(f => {
                const answer = `${uid}-faq${f.index}`;
                return (
                  <div key={f.index} className={s.faq}>
                    <button
                      type="button"
                      className={s.faqBtn}
                      aria-expanded={f.open}
                      aria-controls={answer}
                      onClick={() => actions.toggleSelFaq(f.index)}
                    >
                      <span>{f.q}</span>
                      <span className={s.sign} aria-hidden="true">{f.sign}</span>
                    </button>
                    <div id={answer} className={s.answer} hidden={!f.open}>{f.a}</div>
                  </div>
                );
              })}
            </div>
          )}

          {(vm.crossLine || vm.cross.length > 0) && (
            <div className={s.also}>
              <h3 className={s.eyebrow}>{L.also}</h3>
              {vm.crossLine && <span className={s.crossLine}>« {vm.crossLine} »</span>}
              {vm.cross.length > 0 && (
                <PillRow>
                  {/* Keyed by position: hand-entered data may repeat an id (duplicate keys left a stale pill on product switch). */}
                  {vm.cross.map((m, i) => <ProductPill key={i + '-' + m.id} p={m} size="lg" hover />)}
                </PillRow>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
