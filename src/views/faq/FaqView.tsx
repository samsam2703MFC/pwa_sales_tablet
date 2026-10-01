import { useApp } from '../../state/store';

/** TODO: FAQ clients — implement from the prototype. */
export function FaqView() {
  const { L } = useApp();
  return <section><h1>{L.book} — FAQ clients</h1></section>;
}
