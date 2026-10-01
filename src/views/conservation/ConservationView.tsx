import { useApp } from '../../state/store';

/** TODO: Conservation — implement from the prototype. */
export function ConservationView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Conservation</h1></section>;
}
