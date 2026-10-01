import { useApp } from '../../state/store';

/** TODO: Vendre plus — implement from the prototype. */
export function VentesView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Vendre plus</h1></section>;
}
