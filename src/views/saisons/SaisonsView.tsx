import { useApp } from '../../state/store';

/** TODO: Saisons — implement from the prototype. */
export function SaisonsView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Saisons</h1></section>;
}
