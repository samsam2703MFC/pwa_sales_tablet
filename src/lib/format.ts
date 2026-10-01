import { config } from './config';
import { locale, type Labels } from './i18n';
import type { Lang } from '../data/types';

/** Product price "1,30 €" — empty when unknown or when prices are hidden. */
export const fmtPrice = (n: number | null | undefined, showPrices = config.showPrices): string =>
  n == null || !showPrices ? '' : n.toFixed(2).replace('.', ',') + ' €';

/** Rounded amount with thousands separator: "4 310 €" (fr-BE) / "4.310 €" (nl-BE). */
export const eur = (n: number, lang: Lang): string => Math.round(n).toLocaleString(locale(lang)) + ' €';

/** Amount with 2 decimals: "9,54 €". */
export const eur2 = (n: number): string => n.toFixed(2).replace('.', ',') + ' €';

/** Shelf life label: 0 → "Immédiat", 1 → "Jour même", n → "n jours". */
export const dlcLabel = (d: number, L: Labels): string => (d === 0 ? L.d0 : d === 1 ? L.d1 : d + ' ' + L.dn);
