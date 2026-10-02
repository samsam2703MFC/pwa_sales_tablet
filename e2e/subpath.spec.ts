import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { openSection, pageTitle, ROOT, waitForServiceWorker } from './helpers';

/**
 * The build uses relative URLs (vite `base: './'`), so the very same dist/ also works when it is
 * copied into a sub-folder of a static server (e.g. https://intranet/book-vendeuses/), service
 * worker and offline mode included. The other specs only cover the domain root (`vite preview`).
 */
const DIST = path.join(ROOT, 'dist');
const PREFIX = '/book-vendeuses/';
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

let server: http.Server;
let base: string;
/** Requests the static server could not answer (outside the sub-folder, or no such file). */
const misses: string[] = [];

test.beforeAll(async () => {
  // A plain static server: no SPA fallback, nothing served outside PREFIX.
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = url.startsWith(PREFIX) ? url.slice(PREFIX.length) : null;
    if (file === '') file = 'index.html';
    const full = file === null ? null : path.join(DIST, file);
    if (!full || !full.startsWith(DIST + path.sep) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      misses.push(url);
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(fs.readFileSync(full));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}${PREFIX}`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

test.beforeEach(() => {
  misses.length = 0;
});

test.describe('deployed in a sub-folder', () => {
  test('index.html only uses relative URLs', () => {
    const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const urls = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(m => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url, url).toMatch(/^\.\//);
  });

  test('runs, installs its service worker in the sub-folder and keeps working offline', async ({ page, context, browserName }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(base);
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await waitForServiceWorker(page);
    expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toBe(base);

    if (browserName === 'chromium') {
      const cdp = await context.newCDPSession(page);
      const { errors: manifestErrors, manifest } = await cdp.send('Page.getAppManifest');
      expect(manifestErrors).toEqual([]);
      // The app identity is the sub-folder, not the origin root shared with other apps of the host.
      expect(manifest.id).toBe(base);
      expect(manifest.startUrl).toBe(base);
    }

    // Product illustrations resolve inside the sub-folder.
    await openSection(page, 'La gamme');
    await expect(pageTitle(page, 'La gamme')).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Croissant pur beurre' }).first().click();
    const img = page.getByRole('dialog').locator('img[src$="img/p/croissant.png"]').first();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(560);
    expect(new URL(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).pathname).toBe(`${PREFIX}img/p/croissant.png`);

    await context.setOffline(true);
    await page.goto(`${base}?lang=nl`);
    await expect(pageTitle(page, 'Goedendag!')).toBeVisible();
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, ''));
    });
    expect(fonts).toEqual(expect.arrayContaining(['Gotham', 'Vank']));
    await context.setOffline(false);

    expect(errors).toEqual([]);
    expect(misses).toEqual([]);
  });
});
