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
  /** When it runs this week, in words: "Lun → ven · avant 11 h", "Tous les jours · 14 → 17 h". */
  when: string;
  /** Its slot today ('' when it does not run today, or before the period). */
  today: string;
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

/**
 * The days a bundle runs, in words: consecutive days with the same slot grouped
 * ("lun → ven · avant 11 h", "sam, dim · retrait le matin", "tous les jours · 14 → 17 h").
 */
export function whenLabel(cells: readonly string[], lang: Lang): string {
  const L = bundleLabels(lang);
  const runs: { a: number; b: number; slot: string }[] = [];
  cells.forEach((slot, i) => {
    if (!slot) return;
    const last = runs[runs.length - 1];
    if (last && last.b === i - 1 && last.slot === slot) last.b = i;
    else runs.push({ a: i, b: i, slot });
  });
  const days = ({ a, b }: { a: number; b: number }) =>
    b - a === 6 ? L.everyDay : b - a >= 2 ? `${L.span[a]} → ${L.span[b]}` : b > a ? `${L.span[a]}, ${L.span[b]}` : L.span[a];
  const text = runs.map(r => `${days(r)} · ${r.slot}`).join(' ; ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
  const todayIdx = upcoming ? -1 : dates.findIndex(d => iso(d) === t);

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
        when: '',
        today: '',
      };
    })
    .filter(r => r.cells.some(Boolean))
    .map(r => ({ ...r, when: whenLabel(r.cells, lang), today: todayIdx >= 0 ? r.cells[todayIdx] : '' }));
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
