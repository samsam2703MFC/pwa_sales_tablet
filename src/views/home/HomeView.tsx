import { useApp } from '../../state/store';

/** TODO: Accueil — implement from the prototype. */
export function HomeView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Accueil</h1></section>;
}
