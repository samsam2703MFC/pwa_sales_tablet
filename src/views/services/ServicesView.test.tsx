import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Lang } from '../../data/types';
import { AppProvider } from '../../state/store';
import { ServicesView } from './ServicesView';

const renderSvc = (lang: Lang = 0) =>
  render(
    <AppProvider initial={{ lang, view: 'svc' }}>
      <ServicesView />
    </AppProvider>,
  );

afterEach(cleanup);

describe('ServicesView', () => {
  it('renders the 5 service cards (FR)', () => {
    renderSvc(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Services');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      'Click & collect', 'Commande par téléphone', 'Livraison au bureau', 'Comptes entreprise (B2B)', 'Webshop & application',
    ]);
    expect(screen.getAllByText('Comment ça marche')).toHaveLength(5);
    expect(screen.getAllByText('Délai')).toHaveLength(5);
    expect(screen.getByText('« Avec l\'application, vous cumulez des points à chaque achat. »')).toBeTruthy();
  });

  it('renders in NL', () => {
    renderSvc(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Diensten');
    expect(screen.getAllByText('Hoe werkt het')).toHaveLength(5);
    expect(screen.getAllByText('Termijn')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: 'Telefonische bestelling' })).toBeTruthy();
  });

  it('illustrations are decorative', () => {
    const { container } = renderSvc(0);
    const imgs = [...container.querySelectorAll('img')];
    expect(imgs).toHaveLength(5);
    expect(imgs.every(i => i.getAttribute('alt') === '')).toBe(true);
  });
});
