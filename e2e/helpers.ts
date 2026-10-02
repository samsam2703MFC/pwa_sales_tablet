import type { APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Main navigation: the bottom tab bar, in both orientations (the app has no sidebar). */
export const mainNav = (page: Page) => page.getByRole('navigation');

/**
 * Opens a section: its tab (Accueil, La gamme, Allergènes, FAQ), else its tile in the
 * "Plus" / "Meer" sheet (Saisons, Vendre plus, Services, Conservation, Statistiques, Objectifs,
 * Remarques clients, Les bases, Onboarding). Works the same in landscape and portrait.
 */
export async function openSection(page: Page, label: string): Promise<void> {
  const nav = mainNav(page);
  await nav.waitFor();
  const tab = nav.getByRole('button', { name: label, exact: true });
  if (await tab.count()) return tab.click();
  await nav.getByRole('button', { name: /^(Plus|Meer)$/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: label, exact: true }).click();
  await sheet.waitFor({ state: 'detached' });
}

/** Page title (h1) of the current section. */
export const pageTitle = (page: Page, name: string) => page.getByRole('heading', { level: 1, name, exact: true });

/** Waits until the service worker is active (precache complete) and controls the page. */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
}

/** URLs listed in the Workbox precache manifest of the built service worker. */
export async function precacheManifest(request: APIRequestContext): Promise<string[]> {
  const sw = await (await request.get('sw.js')).text();
  // Minified (`{url:"a",revision:null}`) or not (`{ "url": "a", "revision": null }`).
  return [...sw.matchAll(/["']?url["']?\s*:\s*["']([^"']+)["']\s*,\s*["']?revision["']?\s*:/g)].map(m => m[1]);
}

/** Every illustration shipped in public/img, as app-relative URLs ('img/p/brioche.png'). */
export function publicImages(): string[] {
  const dir = path.join(ROOT, 'public');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  return walk(path.join(dir, 'img'))
    .filter(f => f.endsWith('.png'))
    .map(f => path.relative(dir, f).split(path.sep).join('/'))
    .sort();
}
