import { useApp } from '../../state/store';

/** TODO: Recherche — implement from the prototype. */
export function SearchView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Recherche</h1></section>;
}
