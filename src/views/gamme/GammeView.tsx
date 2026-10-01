import { useApp } from '../../state/store';

/** TODO: La gamme — implement from the prototype. */
export function GammeView() {
  const { L } = useApp();
  return <section><h1>{L.book} — La gamme</h1></section>;
}
