import { BUNDLE_SHOPS, BUNDLES, type Bundle, type BundlePlan, type BundleSection } from '../../data/bundles';
import type { Lang } from '../../data/types';
import { tr } from '../../lib/catalog';
import { fmtPrice } from '../../lib/format';
import { bundleLabels, locale } from '../../lib/i18n';

type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const DAYS: readonly Day[] = [1, 2, 3, 4, 5, 6, 7];

/** One column of the week: Monday → Sunday. */
export interface BundleDayVM {
  n: Day;
  /** "Lun" / "Ma". */
  label: string;
  /** Day of the month ("12"), '' while the week shown is only the pattern (before the period). */
  date: string;
  today: boolean;
}

export interface BundleRowVM {
  id: string;
  name: string;
  content: string;
  /** "3,50 €", or the discount ("−20 %"). */
  price: string;
  /** "Click & collect" / "Livraison"; '' in the shop. */
  channel: string;
  section: BundleSection;
  /** The slot of each day (Monday first), '' when it does not run that day; its last word glued (no-break space). */
  cells: string[];
  /** "Seulement à Gosselies, Halle, Sombreffe · Halle : …" when the tablet is not tied to a shop. */
  note: string;
}

export interface BundleWeekVM {
  /** The week shown is before the period: the weekly pattern, without dates. */
  upcoming: boolean;
  /** "Dès le jeudi 15 octobre" while the period has not started, else ''. */
  start: string;
  /** "Du 15 octobre au 15 décembre". */
  period: string;
  days: BundleDayVM[];
  rows: BundleRowVM[];
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Glues the last word to the one before (no "11 / h" or a lone "%" on its own line in a narrow cell). */
const glue = (t: string) => t.replace(/ (?=\S+$)/, '\u00a0');

/** Does the bundle run in this shop (null: not tied to a shop → every bundle)? */
const inShop = (b: Bundle, shop: string | null) => !shop || !b.shops || b.shops.includes(shop);

/**
 * The bundles of the week of `today` (Monday → Sunday) for `shop`: each with its slot per day.
 * Before the period, the weekly pattern (no dates) with "Dès le …"; a week that overlaps the
 * period keeps only its days inside it. Null after the period, or when nothing runs this week.
 */
export function bundleWeek(today: Date, shop: string | null, lang: Lang, plan: BundlePlan = BUNDLES): BundleWeekVM | null {
  const L = bundleLabels(lang);
  const loc = locale(lang);
  const t = iso(today);
  if (t > plan.to) return null;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const dates = DAYS.map(n => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + n - 1));
  const upcoming = iso(dates[6]) < plan.from;
  const runs = (n: Day) => upcoming || (iso(dates[n - 1]) >= plan.from && iso(dates[n - 1]) <= plan.to);

  const rows = plan.bundles
    .filter(b => inShop(b, shop))
    .map((b): BundleRowVM => {
      const restricted = !shop && b.shops ? `${L.only} ${b.shops.map(id => BUNDLE_SHOPS[id] ?? id).join(', ')}` : '';
      const variants = !shop && b.shopContent
        ? Object.entries(b.shopContent).map(([id, c]) => `${BUNDLE_SHOPS[id] ?? id}${L.colon}${tr(c, lang)}`)
        : [];
      return {
        id: b.id,
        name: tr(b.name, lang),
        content: tr((shop && b.shopContent?.[shop]) || b.content, lang),
        price: b.price !== null ? fmtPrice(b.price) : glue(tr(b.offer, lang)),
        channel: b.channel === 'shop' ? '' : L.channels[b.channel],
        section: b.section,
        cells: DAYS.map(n => (runs(n) ? glue(tr(b.days[n], lang)) : '')),
        note: [restricted, ...variants].filter(Boolean).join(' · '),
      };
    })
    .filter(r => r.cells.some(Boolean));
  if (!rows.length) return null;

  const long = (d: Date) => d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const short = (d: Date) => d.toLocaleDateString(loc, { day: 'numeric', month: 'long' });
  return {
    upcoming,
    start: t < plan.from ? `${L.from} ${long(parse(plan.from))}` : '',
    period: L.period(short(parse(plan.from)), short(parse(plan.to))),
    days: DAYS.map(n => ({ n, label: L.days[n - 1], date: upcoming ? '' : String(dates[n - 1].getDate()), today: !upcoming && iso(dates[n - 1]) === t })),
    rows,
  };
}
