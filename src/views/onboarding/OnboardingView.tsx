import { useApp } from '../../state/store';

/** TODO: Onboarding — implement from the prototype. */
export function OnboardingView() {
  const { L } = useApp();
  return <section><h1>{L.book} — Onboarding</h1></section>;
}
