import { BOOK } from '../../data/book';
import type { Lang, Service } from '../../data/types';
import { asset } from '../../lib/asset';
import { tr } from '../../lib/catalog';

/** A service card. `say` is the sentence to say, without the « » quotes. */
export interface ServiceVM {
  id: string;
  name: string;
  /** Resolved image URL. */
  img: string;
  how: string;
  delay: string;
  say: string;
}

/** The prototype's `services`, in data order. */
export const serviceCards = (lang: Lang, services: readonly Service[] = BOOK.services): ServiceVM[] =>
  services.map(x => ({
    id: x.id,
    name: tr(x.n, lang),
    img: asset(x.img),
    how: tr(x.how, lang),
    delay: tr(x.delay, lang),
    say: tr(x.say, lang),
  }));
