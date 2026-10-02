import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openSection, pageTitle, precacheManifest, publicImages, ROOT, waitForServiceWorker } from './helpers';

interface ManifestIcon { src: string; sizes: string; type: string; purpose?: string }

/** Decodes an image in the page and returns its intrinsic size as 'WxH'. */
const naturalSize = (page: Page, url: string) =>
  page.evaluate(async src => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return `${img.naturalWidth}x${img.naturalHeight}`;
  }, url);

/** Largest distance from the centre (as a fraction of the size) of pixels that differ from the corner colour. */
const inkRadius = (page: Page, url: string) =>
  page.evaluate(async src => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const { width: w, height: h } = img;
    const ctx = new OffscreenCanvas(w, h).getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    let max = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const diff = Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]);
        if (diff > 24) max = Math.max(max, Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / w);
      }
    }
    return max;
  }, url);

test.describe('installable PWA', () => {
  test('web app manifest, icons and head tags', async ({ page, request }) => {
    await page.goto('/');
    const manifestUrl = new URL((await page.locator('link[rel="manifest"]').getAttribute('href'))!, page.url()).href;
    const manifest = await (await request.get(manifestUrl)).json();
    expect(manifest).toMatchObject({
      name: "Book vendeuses — L'Atelier By",
      short_name: 'Book vendeuses',
      lang: 'fr',
      start_url: '.',
      scope: '.',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#EAE4DC',
      background_color: '#EAE4DC',
    });
    // No explicit id: the identity is start_url, i.e. the folder the app is served from
    // (a relative id would resolve against the origin, see vite.config.ts and subpath.spec.ts).
    expect(manifest).not.toHaveProperty('id');
    expect(manifest.description).toContain('hors connexion');
    expect(manifest.categories).toEqual(expect.arrayContaining(['business', 'food']));

    const icons: ManifestIcon[] = manifest.icons;
    for (const [sizes, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['192x192', 'maskable'], ['512x512', 'maskable']]) {
      expect(icons).toContainEqual(expect.objectContaining({ sizes, purpose, type: 'image/png' }));
    }
    for (const icon of icons) {
      expect(await naturalSize(page, new URL(icon.src, manifestUrl).href), icon.src).toBe(icon.sizes);
    }
    // Maskable icons keep the drawing inside the safe zone (circle of radius 40 %).
    for (const icon of icons.filter(i => i.purpose === 'maskable')) {
      expect(await inkRadius(page, new URL(icon.src, manifestUrl).href), icon.src).toBeLessThan(0.4);
    }

    const head = page.locator('head');
    await expect(head.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#EAE4DC');
    await expect(head.locator('meta[name="description"]')).toHaveAttribute('content', /hors connexion/);
    await expect(head.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    const apple = (await head.locator('link[rel="apple-touch-icon"]').getAttribute('href'))!;
    expect(await naturalSize(page, new URL(apple, page.url()).href)).toBe('180x180');
    for (const href of await head.locator('link[rel="icon"]').evaluateAll(ls => ls.map(l => (l as HTMLLinkElement).href))) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      expect(res.headers()['content-type'], href).toMatch(/^image\//);
    }
  });

  test('Chrome sees the app as installable', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome DevTools Protocol only');
    await page.goto('/');
    await waitForServiceWorker(page);
    const cdp = await page.context().newCDPSession(page);
    const { errors, manifest } = await cdp.send('Page.getAppManifest');
    expect(errors).toEqual([]);
    // The id defaults to start_url: the folder the app is served from (here the domain root).
    expect(manifest.id).toBe(new URL('/', page.url()).href);
    expect(manifest.startUrl).toBe(new URL('/', page.url()).href);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    // Playwright contexts are off-the-record profiles, where Chrome never offers installation.
    expect(installabilityErrors.filter(e => e.errorId !== 'in-incognito')).toEqual([]);
  });

  test('precaches the whole app: shell, fonts, every illustration and icon', async ({ page, request }) => {
    const urls = await precacheManifest(request);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of ['index.html', 'manifest.webmanifest', 'favicon.ico']) expect(urls).toContain(url);
    for (const img of publicImages()) expect(urls, img).toContain(img);
    for (const icon of fs.readdirSync(path.join(ROOT, 'public/icons'))) expect(urls).toContain(`icons/${icon}`);

    await page.goto('/');
    // Every script, stylesheet and font of the shell.
    const css = await page.locator('link[rel="stylesheet"]').evaluateAll(ls => ls.map(l => (l as HTMLLinkElement).href));
    const js = await page.locator('script[src]').evaluateAll(ss => ss.map(s => (s as HTMLScriptElement).src));
    const assets = [...css, ...js].map(u => new URL(u).pathname.slice(1));
    for (const href of css) {
      const text = await (await request.get(href)).text();
      for (const m of text.matchAll(/url\(\s*["']?([^"')]+\.(?:otf|ttf|woff2?))/g)) assets.push(new URL(m[1], href).pathname.slice(1));
    }
    expect(assets.filter(a => /\.(otf|ttf|woff2?)$/.test(a)).length).toBeGreaterThan(0);
    for (const a of assets) expect(urls, a).toContain(a);

    // Once the worker is installed, the cache holds exactly the manifest.
    await waitForServiceWorker(page);
    const cached = await page.evaluate(async () => {
      const name = (await caches.keys()).find(n => n.startsWith('workbox-precache'));
      const keys = name ? await (await caches.open(name)).keys() : [];
      return keys.map(r => new URL(r.url).pathname.slice(1));
    });
    expect(cached.sort()).toEqual([...urls].sort());
  });
});

test.describe('offline', () => {
  test('keeps working offline after the first visit', async ({ page, context }) => {
    await page.goto('/');
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await waitForServiceWorker(page);

    await context.setOffline(true);
    await page.reload();
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    // Brand fonts come from the cache too.
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, ''));
    });
    expect(fonts).toEqual(expect.arrayContaining(['Gotham', 'Vank']));

    // Navigate and open a product sheet: its illustration is served from the cache.
    await openSection(page, 'La gamme');
    await expect(pageTitle(page, 'La gamme')).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Croissant pur beurre' }).first().click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Croissant pur beurre', exact: true })).toBeVisible();
    const img = sheet.locator('img[src$="img/p/croissant.png"]').first();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(560);

    // Any navigation falls back to the cached app shell.
    await page.goto('/?lang=nl');
    await expect(pageTitle(page, 'Goedendag!')).toBeVisible();
  });
});
