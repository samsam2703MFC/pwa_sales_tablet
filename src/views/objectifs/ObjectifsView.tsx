import { PageTitle } from '../../components/PageTitle';
import { BOOK_SOURCE } from '../../data/book';
import { navLabel, objLabels } from '../../lib/i18n';
import { useApp } from '../../state/store';
import { ObjectivesBlock } from '../home/Objectives';
import s from './ObjectifsView.module.css';

/** « Objectifs »: the shop's revenue and cross-sell targets, week and month (from the BO). */
export function ObjectifsView() {
  const { lang } = useApp();
  return (
    <section className={s.page}>
      <PageTitle>{navLabel('obj', lang)}</PageTitle>
      {BOOK_SOURCE.kind === 'sample'
        ? <p className={s.note}>{objLabels(lang).sampleNote}</p>
        : <ObjectivesBlock eyebrow={false} />}
    </section>
  );
}
