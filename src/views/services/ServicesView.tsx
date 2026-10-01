import { useApp } from '../../state/store';

/** TODO: Services — implement from the prototype. */
export function ServicesView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Services</h1></section>;
}
