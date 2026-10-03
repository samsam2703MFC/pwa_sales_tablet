import type { T2 } from './types';

/**
 * The network's bundles (« Les bundles du réseau », document du réseau L'Atelier du 2 octobre
 * 2026, période du 15 octobre au 15 décembre 2026): one price for the whole network, per day of
 * the week and time of day. Shown on the home page as "Les bundles de la semaine". Margins and
 * internal targets of the document are left out: the tablet only says what the customer gets.
 *
 * Not in the BO yet: to move to it (one source for every shop) when the bundles are encoded there.
 */

/** Time of day of a bundle, as coloured in the network document. */
export type BundleSection = 'matin' | 'midi' | 'apresMidi' | 'weekend' | 'jour';

/** How the customer gets it: in the shop (default), click & collect, or delivered. */
export type BundleChannel = 'shop' | 'cc' | 'delivery';

export interface Bundle {
  id: string;
  name: T2;
  /** What the customer gets. */
  content: T2;
  /** Network price; null when the bundle is a discount (see `offer`). */
  price: number | null;
  /** Discount shown instead of a price (e.g. "−20 %"). */
  offer?: T2;
  channel: BundleChannel;
  section: BundleSection;
  /** Days of the week it runs (1 = Monday … 7 = Sunday) → the slot that day. */
  days: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, T2>>>;
  /** Shop ids where it runs; absent = every shop. */
  shops?: readonly string[];
  /** Another content in some shops (shop id → content). */
  shopContent?: Readonly<Record<string, T2>>;
}

export interface BundlePlan {
  /** First and last day (YYYY-MM-DD). */
  from: string;
  to: string;
  bundles: readonly Bundle[];
}

const weekdays = (slot: T2) => ({ 1: slot, 2: slot, 3: slot, 4: slot, 5: slot });
const ALL_DAY: T2 = ['toute la journée', 'de hele dag'];

/** Shop ids of the network: 2 Corbais, 3 Gosselies, 4 Halle, 5 Sombreffe. */
export const BUNDLES: BundlePlan = {
  from: '2026-10-15',
  to: '2026-12-15',
  bundles: [
    {
      id: 'site', name: ['Offre site', 'Webshopactie'], content: ['−20 % dès 10 € d\'achat sur le site', '−20 % vanaf 10 € aankoop op de webshop'],
      price: null, offer: ['−20 %', '−20 %'], channel: 'cc', section: 'jour', days: weekdays(['−20 %', '−20 %']),
    },
    {
      id: 'petitdej', name: ['Le petit-déj', 'Het ontbijt'], content: ['1 viennoiserie + 1 café', '1 koffiekoek + 1 koffie'],
      price: 3.5, channel: 'shop', section: 'matin', days: weekdays(['avant 11 h', 'voor 11 u']),
    },
    {
      id: 'lunch', name: ['Le lunch', 'De lunch'], content: ['Flip & Flap + boisson + éclair', 'Flip & Flap + drankje + éclair'],
      price: 8.5, channel: 'shop', section: 'midi', days: weekdays(['11 → 14 h', '11 → 14 u']),
    },
    {
      id: 'bureau', name: ['Formule bureau', 'Kantoorformule'], content: ['Livrée au bureau', 'Geleverd op kantoor'],
      price: 7.9, channel: 'delivery', section: 'jour', days: weekdays(['livraison', 'levering']),
    },
    {
      id: 'gouter', name: ['Le goûter', 'Het vieruurtje'], content: ['1 éclair + 1 café', '1 éclair + 1 koffie'],
      price: 4.5, channel: 'shop', section: 'apresMidi',
      days: { ...weekdays(['14 → 17 h', '14 → 17 u']), 6: ['14 → 17 h', '14 → 17 u'], 7: ['14 → 17 h', '14 → 17 u'] },
    },
    {
      id: 'quichetarte', name: ['Quiche + tarte', 'Quiche + taart'], content: ['1 quiche + ¼ de tarte', '1 quiche + ¼ taart'],
      price: 19.9, channel: 'shop', section: 'weekend', days: { 5: ALL_DAY, 6: ALL_DAY, 7: ALL_DAY },
      shops: ['3', '4', '5'], shopContent: { 4: ['½ quiche + ½ tarte', '½ quiche + ½ taart'] },
    },
    {
      id: 'croissants', name: ['4 + 2 croissants', '4 + 2 croissants'], content: ['4 viennoiseries + 2 croissants offerts', '4 koffiekoeken + 2 croissants gratis'],
      price: 6.9, channel: 'cc', section: 'weekend', days: { 6: ['retrait le matin', "'s ochtends afhalen"], 7: ['retrait le matin', "'s ochtends afhalen"] },
    },
    {
      id: 'grands', name: ['Grands formats', 'Grote formaten'], content: ['Tartes 28 cm et plus de 20 €', 'Taarten 28 cm en meer dan 20 €'],
      price: 19.9, channel: 'cc', section: 'weekend', days: { 6: ALL_DAY, 7: ALL_DAY },
    },
  ],
};

/** Names of the shops of the network, for "only in …" notes when the tablet is not tied to a shop. */
export const BUNDLE_SHOPS: Readonly<Record<string, string>> = { 2: 'Corbais', 3: 'Gosselies', 4: 'Halle', 5: 'Sombreffe' };
