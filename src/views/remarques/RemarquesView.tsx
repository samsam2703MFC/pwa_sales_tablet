import { PageTitle } from '../../components/PageTitle';
import { navLabel } from '../../lib/i18n';
import { useApp } from '../../state/store';
import { RemarkForm } from '../home/RemarkForm';
import s from './RemarquesView.module.css';

/** « Remarques clients »: the customer remark form, sent to the BO. */
export function RemarquesView() {
  const { lang } = useApp();
  return (
    <section className={s.page}>
      <PageTitle>{navLabel('rem', lang)}</PageTitle>
      <div className={s.form}>
        <RemarkForm />
      </div>
    </section>
  );
}
