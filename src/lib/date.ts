import { config } from './config';
import { locale } from './i18n';
import type { Lang } from '../data/types';

/** "Now" for the app — the device clock unless pinned with `?date=`. */
export const now = (): Date => (config.date ? new Date(config.date) : new Date());

/** Current month, 1–12. */
export const currentMonth = (): number => now().getMonth() + 1;

/** Header date, e.g. "jeudi 1 octobre" / "donderdag 1 oktober" (capitalised by CSS). */
export const todayLabel = (lang: Lang): string =>
  now().toLocaleDateString(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' });
