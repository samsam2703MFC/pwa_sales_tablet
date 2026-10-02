import { describe, expect, it } from 'vitest';
import { roots } from './api';

describe('roots', () => {
  it('in the BO: API and BO files next to the app folder, query string ignored', () => {
    expect(roots('http://185.180.206.46/consulant_bo/tablette/?shop=4&lang=nl', './')).toEqual({
      app: 'http://185.180.206.46/consulant_bo/tablette/',
      api: 'http://185.180.206.46/consulant_bo/api/cockpit',
      pub: 'http://185.180.206.46/consulant_bo/',
    });
  });

  it('opened as …/tablette/index.html: same roots', () => {
    expect(roots('https://bo.test/consulant_bo/tablette/index.html', './').api).toBe('https://bo.test/consulant_bo/api/cockpit');
  });

  it('at the domain root (vite preview) and under vite dev (BASE_URL "/")', () => {
    expect(roots('http://127.0.0.1:4173/', './')).toEqual({ app: 'http://127.0.0.1:4173/', api: 'http://127.0.0.1:4173/api/cockpit', pub: 'http://127.0.0.1:4173/' });
    expect(roots('http://localhost:5173/?shop=4', '/')).toEqual({ app: 'http://localhost:5173/', api: 'http://localhost:5173/api/cockpit', pub: 'http://localhost:5173/' });
  });

  it('VITE_API_BASE overrides the API root (absolute or relative to the app), "auto" or empty keeps it derived', () => {
    const href = 'http://bo.test/consulant_bo/tablette/';
    expect(roots(href, './', 'https://api.test/cockpit/').api).toBe('https://api.test/cockpit');
    expect(roots(href, './', '../../other/api/cockpit').api).toBe('http://bo.test/other/api/cockpit');
    expect(roots(href, './', 'auto').api).toBe('http://bo.test/consulant_bo/api/cockpit');
    expect(roots(href, './', '').api).toBe('http://bo.test/consulant_bo/api/cockpit');
    // BO files always come from the BO public root
    expect(roots(href, './', 'https://api.test/cockpit').pub).toBe('http://bo.test/consulant_bo/');
  });
});
