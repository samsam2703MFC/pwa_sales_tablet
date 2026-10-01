import { useApp } from '../../state/store';

/** TODO: Allergènes — implement from the prototype. */
export function AllergensView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Allergènes</h1></section>;
}
