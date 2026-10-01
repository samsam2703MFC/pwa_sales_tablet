import { describe, expect, it } from 'vitest';
import { serviceCards } from './services.logic';

describe('serviceCards', () => {
  it('lists the 5 services in data order (FR)', () => {
    const s = serviceCards(0);
    expect(s.map(x => x.id)).toEqual(['cc', 'tel', 'bur', 'b2b', 'web']);
    expect(s.map(x => x.name)).toEqual([
      'Click & collect',
      'Commande par téléphone',
      'Livraison au bureau',
      'Comptes entreprise (B2B)',
      'Webshop & application',
    ]);
    expect(s[0].delay).toBe('Commande avant 22 h pour le lendemain.');
    expect(s[0].say).toBe("Votre commande est prête au comptoir, c'est à quel nom ?");
  });

  it('is translated (NL)', () => {
    const s = serviceCards(1);
    expect(s.map(x => x.name)).toEqual([
      'Click & collect',
      'Telefonische bestelling',
      'Levering op kantoor',
      'Bedrijfsaccounts (B2B)',
      'Webshop & app',
    ]);
    expect(s[4].delay).toBe('24 u/24 beschikbaar.');
  });

  it('resolves the illustration against the app base URL', () => {
    expect(serviceCards(0)[0].img).toMatch(/^\/.*img\/svc\/click-collect\.png$/);
  });
});
