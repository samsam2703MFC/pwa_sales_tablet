import { AppProvider, useApp } from './state/store';
import { AppShell } from './shell/AppShell';
import { SearchView } from './views/search/SearchView';
import { HomeView } from './views/home/HomeView';
import { GammeView } from './views/gamme/GammeView';
import { SaisonsView } from './views/saisons/SaisonsView';
import { AllergensView } from './views/allergens/AllergensView';
import { VentesView } from './views/ventes/VentesView';
import { FaqView } from './views/faq/FaqView';
import { ServicesView } from './views/services/ServicesView';
import { ConservationView } from './views/conservation/ConservationView';
import { StatsView } from './views/stats/StatsView';
import { OnboardingView } from './views/onboarding/OnboardingView';

/** The page content: search results as soon as there is a query, else the current section. */
function CurrentView() {
  const { state } = useApp();
  if (state.q.trim()) return <SearchView />;
  switch (state.view) {
    case 'home': return <HomeView />;
    case 'gamme': return <GammeView />;
    case 'saisons': return <SaisonsView />;
    case 'al': return <AllergensView />;
    case 'ventes': return <VentesView />;
    case 'faq': return <FaqView />;
    case 'svc': return <ServicesView />;
    case 'cons': return <ConservationView />;
    case 'stats': return <StatsView />;
    case 'onb': return <OnboardingView />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <CurrentView />
      </AppShell>
    </AppProvider>
  );
}
