import type { Lang } from '../data/types';

/**
 * App configuration — the prototype's component props.
 *
 * - `defaultLang` ('FR' | 'NL'): initial language. Build-time `VITE_DEFAULT_LANG`,
 *   overridable at runtime with `?lang=nl`.
 * - `showPrices` (boolean): hides every price when false. Build-time
 *   `VITE_SHOW_PRICES=false`, overridable at runtime with `?prices=0`.
 * - `?date=YYYY-MM-DD` pins "today" (season of the moment, calendar highlight,
 *   header date) — handy for demos and screenshots.
 */
export interface AppConfig {
  defaultLang: Lang;
  showPrices: boolean;
  /** Fixed "today", or null to use the device clock. */
  date: Date | null;
}

const parseBool = (v: string | null | undefined): boolean | null => {
  if (v == null || v === '') return null;
  return !/^(0|false|no|off)$/i.test(v);
};

const parseLang = (v: string | null | undefined): Lang | null => {
  if (!v) return null;
  return v.toUpperCase() === 'NL' ? 1 : v.toUpperCase() === 'FR' ? 0 : null;
};

const parseDate = (v: string | null | undefined): Date | null => {
  const m = v && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function readConfig(search: string, env: Record<string, string | undefined>): AppConfig {
  const p = new URLSearchParams(search);
  return {
    defaultLang: parseLang(p.get('lang')) ?? parseLang(env.VITE_DEFAULT_LANG) ?? 0,
    showPrices: parseBool(p.get('prices')) ?? parseBool(env.VITE_SHOW_PRICES) ?? true,
    date: parseDate(p.get('date')),
  };
}

export const config: AppConfig = readConfig(
  typeof window === 'undefined' ? '' : window.location.search,
  import.meta.env as Record<string, string | undefined>,
);
