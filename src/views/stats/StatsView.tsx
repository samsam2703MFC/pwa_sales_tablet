import { useApp } from '../../state/store';

/** TODO: Statistiques — implement from the prototype. */
export function StatsView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Statistiques</h1></section>;
}
