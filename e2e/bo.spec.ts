import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { OBJECTIVES_PAYLOAD } from '../src/test/objectivesFixture';
import { REMOTE_PAYLOAD } from '../src/test/remoteFixture';
import { openSection, pageTitle, ROOT, waitForServiceWorker } from './helpers';

/**
 * The app fed by the back-office: GET <app>/../api/cockpit/tablette/book?shop=<id>, the shop's
 * targets (GET …/tablette/objectifs?shop=<id>), the customer remarks (POST …/tablette/remarques)
 * and the product photos under <app>/../uploads/ are mocked with routes (vite preview serves the
 * app at the domain root, so they live at /api/… and /uploads/…), and served by a BO-like server
 * for the offline test.
 */
const BOOK = '**/api/cockpit/tablette/book*';
const OBJECTIVES = '**/api/cockpit/tablette/objectifs*';
const REMARKS = '**/api/cockpit/tablette/remarques';
const UPLOADS = '**/uploads/**';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** French amounts group digits with a (narrow) no-break space. */
const amount = (text: string) => new RegExp('^' + text.replace(/[/.]/g, m => '\\' + m).replace(/ /g, '\\s') + '$');
/** Any PNG works as a "photo"; 192×192 tells it apart from the illustrations (560) and the placeholder. */
const PHOTO = fs.readFileSync(path.join(ROOT, 'public/icons/icon-192.png'));
const PHOTO_SIZE = 192;

/**
 * A BO-like static server for the offline test: the app at /consulant_bo/tablette/, the book at
 * /consulant_bo/api/cockpit/tablette/book, photos under /consulant_bo/uploads/. Playwright
 * routes do not see the requests of a service worker, a real server does. `up = false` drops
 * every BO connection (BO down / no network).
 */
const bo = { base: '', up: true, asked: [] as string[], misses: [] as string[] };
let server: http.Server;
const DIST = path.join(ROOT, 'dist');
const APP = '/consulant_bo/tablette/';
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const p = decodeURIComponent(url.pathname);
    if (p === '/consulant_bo/api/cockpit/tablette/book' || p === '/consulant_bo/api/cockpit/tablette/objectifs' || p.startsWith('/consulant_bo/uploads/')) {
      bo.asked.push(p + url.search);
      if (!bo.up) return void req.socket.destroy();
      if (p.startsWith('/consulant_bo/uploads/')) return void res.writeHead(200, { 'content-type': 'image/png' }).end(PHOTO);
      const body = p.endsWith('/objectifs') ? OBJECTIVES_PAYLOAD : REMOTE_PAYLOAD;
      return void res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body));
    }
    const file = p.startsWith(APP) ? path.join(DIST, p.slice(APP.length) || 'index.html') : null;
    if (!file || !file.startsWith(DIST + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      bo.misses.push(p);
      return void res.writeHead(404).end();
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(fs.readFileSync(file));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  bo.base = `http://127.0.0.1:${(server.address() as AddressInfo).port}${APP}`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

test.beforeEach(() => {
  Object.assign(bo, { up: true, asked: [], misses: [] });
});

/** Serves the BO book, targets and photos (vite preview, domain root); returns the book URLs asked for. */
async function mockBo(page: Page): Promise<string[]> {
  const asked: string[] = [];
  await page.route(BOOK, route => {
    asked.push(route.request().url());
    return route.fulfill({ json: REMOTE_PAYLOAD, headers: { 'cache-control': 'no-store' } });
  });
  await mockObjectives(page);
  await page.route(UPLOADS, route => route.fulfill({ body: PHOTO, contentType: 'image/png' }));
  return asked;
}

/** Serves the shop's targets; returns the URLs asked for. */
async function mockObjectives(page: Page): Promise<string[]> {
  const asked: string[] = [];
  await page.route(OBJECTIVES, route => {
    asked.push(route.request().url());
    return route.fulfill({ json: OBJECTIVES_PAYLOAD, headers: { 'cache-control': 'no-store' } });
  });
  return asked;
}

/**
 * A BO receiving the customer remarks: `received` lists the JSON bodies it accepted; while
 * `up` is false the connection fails (no network).
 */
async function mockRemarks(page: Page) {
  const bo = { up: true, received: [] as Record<string, unknown>[], requests: 0 };
  await page.route(REMARKS, route => {
    bo.requests++;
    const req = route.request();
    if (!bo.up) return route.abort('internetdisconnected');
    if (req.method() !== 'POST' || !/^application\/json/.test(req.headers()['content-type'] ?? '')) return route.fulfill({ status: 400, json: { erreur: 'POST JSON' } });
    const body = req.postDataJSON() as Record<string, unknown>;
    bo.received.push(body);
    return route.fulfill({ status: 201, json: { ok: true, id: body.id } });
  });
  return bo;
}

/** The customer remark form of the home page. */
const remarkForm = (page: Page) => page.getByRole('form', { name: "Remarque d'un client" });

/** Natural width of the first image whose URL ends with `suffix` inside `scope`, once loaded. */
const loadedWidth = (page: Page, scope: string, suffix: string) =>
  page.locator(`${scope} img[src$="${suffix}"]`).first().evaluate((i: HTMLImageElement) => (i.complete ? i.naturalWidth : 0));

/** Data-source indicator: the pill of the top bar (both orientations). */
const source = (page: Page) => page.getByText(/^(BO|Hors ligne) · /);

test.describe('data from the back-office', () => {
  // Page routes do not see what a service worker fetches: keep it out of these two tests
  // (the offline test below runs with it, against a real server).
  test.use({ serviceWorkers: 'block' });

  test('shows the BO book: names, photos, shop, unverified allergens', async ({ page }) => {
    const asked = await mockBo(page);
    await page.goto('/?shop=4');
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    expect(asked[0]).toMatch(/\/api\/cockpit\/tablette\/book\?shop=4$/);
    await expect(source(page)).toHaveText(/^BO · Ixelles · 2 oct\.? 09[:h]12$/);
    await expect(page.getByText(/Données d'exemple/)).toHaveCount(0);
    // the shop is remembered for the installed app, which opens without ?shop=
    expect(await page.evaluate(() => localStorage.getItem('bv.shop'))).toBe('4');

    // Home: the shop's targets from the BO (gauges are covered below)
    const main = page.getByRole('main');
    await expect(main.getByText(amount('4 311 € / 6 000 €'))).toBeVisible();

    // La gamme: BO categories, photos (thumbnail or panel original), placeholder without photo
    await openSection(page, 'La gamme');
    await expect(pageTitle(page, 'La gamme')).toBeVisible();
    for (const c of ['Viennoiserie', 'Pain', 'Pâtisserie']) await expect(main.getByRole('heading', { name: c, exact: true })).toBeVisible();
    await expect.poll(() => loadedWidth(page, 'main', '/uploads/tablette/1610006-640.jpg')).toBe(PHOTO_SIZE);
    await expect.poll(() => loadedWidth(page, 'main', '/uploads/plano/panel/1610042.png')).toBe(PHOTO_SIZE);
    const noPhoto = main.getByRole('button', { name: /Pain gris multicéréales/ }).locator('img');
    await expect(noPhoto).toHaveAttribute('src', /img\/placeholder\.svg$/);
    await expect.poll(() => noPhoto.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    await expect(main.getByText("À vérifier sur l'étiquette")).toHaveCount(4);

    // Product sheet: allergens to check on the label, with the BO text; no tile claims "absent"
    await main.getByRole('button', { name: /Croissant au beurre AOP/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Croissant au beurre AOP' });
    await expect(sheet.getByText("À vérifier sur l'étiquette")).toBeVisible();
    await expect(sheet.getByText('Détail : Contient : gluten, lait, œuf. Traces : fruits à coque.')).toBeVisible();
    await expect(sheet.getByRole('listitem')).toHaveCount(0);
    await expect(sheet.getByRole('heading', { name: 'À dire au client' })).toHaveCount(0);
    await expect(sheet.getByRole('heading', { name: 'Proposez aussi' })).toHaveCount(0);
    await expect(sheet.getByText('Température ambiante. Réchauffe 3 min à 180 °C.')).toBeVisible();
    await expect.poll(() => loadedWidth(page, '[role="dialog"]', '/uploads/tablette/1610006-640.jpg')).toBe(PHOTO_SIZE);
    await sheet.getByRole('button', { name: 'Fermer', exact: true }).click();

    // "Conservation" is always there: "Non renseignée", muted, when the BO has no text
    await main.getByRole('button', { name: /Couque suisse aux raisins/ }).click();
    const couque = page.getByRole('dialog', { name: 'Couque suisse aux raisins' });
    const none = couque.getByText('Non renseignée', { exact: true });
    await expect(none).toBeVisible();
    await expect(couque.getByRole('heading', { name: 'Conservation', exact: true })).toBeVisible();
    const colour = (l: typeof none) => l.evaluate(e => getComputedStyle(e).color);
    expect(await colour(none)).not.toBe(await colour(couque.getByText('Jour même', { exact: true })));
    await couque.getByRole('button', { name: 'Fermer', exact: true }).click();

    // "Sans gluten ?": nothing is ever shown as compatible
    await openSection(page, 'Allergènes');
    await main.getByRole('button', { name: 'Gluten', exact: true }).click();
    await expect(main.getByText('OK', { exact: true })).toHaveCount(0);
    await expect(main.getByText('À vérifier', { exact: true })).toHaveCount(4);
    await expect(page.getByRole('status').filter({ hasText: 'produits compatibles' })).toHaveText(
      "0 produits compatibles, 0 avec traces possibles, 4 à vérifier sur l'étiquette",
    );
  });

  test('a new BO book is applied by reloading once the tablet is idle, never during a sale', async ({ page }) => {
    await page.clock.install();
    let book: object = REMOTE_PAYLOAD;
    let served = 0;
    await page.route(BOOK, route => {
      served++;
      return route.fulfill({ json: book });
    });
    await page.route(UPLOADS, route => route.fulfill({ body: PHOTO, contentType: 'image/png' }));
    await mockObjectives(page);
    await page.goto('/?shop=4');
    const main = page.getByRole('main');
    await openSection(page, 'La gamme');
    await main.getByRole('button', { name: /Croissant au beurre AOP/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Croissant au beurre AOP' });
    await expect(sheet).toBeVisible();

    // The BO publishes a new book; the app looks for it at most once an hour.
    const renamed = structuredClone(REMOTE_PAYLOAD);
    renamed.version = 'v2';
    renamed.book.products[0].name = ['Croissant au beurre (nouvelle recette)', ''];
    book = renamed;
    // The jump fires the 5-minute poll once: an hour has passed, the book is asked for.
    await page.clock.fastForward('01:00:00');
    await expect.poll(() => served).toBe(2);
    // Let the app read the answer (real time) before moving the fake clock on: jumping ahead
    // now would fire the request's timeout first.
    await page.waitForTimeout(500);
    // Someone is using the tablet: nothing moves under their fingers.
    await expect(sheet).toBeVisible();
    await page.clock.runFor(60 * 1000);
    await expect(sheet).toBeVisible();
    // Two minutes without a touch: the page reloads onto the new book.
    await page.clock.runFor(60 * 1000);
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await openSection(page, 'La gamme');
    await expect(main.getByRole('button', { name: /Croissant au beurre \(nouvelle recette\)/ })).toBeVisible();
  });

  test('without a BO answer (no BO, HTML page, error), the sample data and its label', async ({ page }) => {
    await page.route(BOOK, route => route.fulfill({ status: 500, json: { erreur: 'panne' } }));
    const objectives = await mockObjectives(page);
    await page.goto('/?shop=4');
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await expect(page.getByText(/^Données d'exemple/).first()).toBeVisible();
    // No targets with the sample data: the block is hidden and nothing is asked.
    await expect(remarkForm(page)).toBeVisible();
    await expect(page.getByText('Objectifs', { exact: true })).toHaveCount(0);
    expect(objectives).toEqual([]);
    await openSection(page, 'La gamme');
    await expect(page.getByRole('main').getByRole('button', { name: /Croissant pur beurre/ }).first()).toBeVisible();
  });

  test('home: the shop\'s targets from the BO, as gauges', async ({ page }) => {
    await mockBo(page);
    const objectives = await mockObjectives(page);
    await page.goto('/?shop=4');
    await expect(page.getByText('Objectifs', { exact: true })).toBeVisible();
    expect(objectives[0]).toMatch(/\/api\/cockpit\/tablette\/objectifs\?shop=4$/);

    /** Rows of a card: [period, value, status] and the bar's fill (% of the track). */
    const rows = (title: string) => page.getByRole('heading', { level: 2, name: title, exact: true }).locator('xpath=..').evaluate(card =>
      [...card.children].slice(1).map(r => {
        const [head, track, status] = [...r.children] as HTMLElement[];
        const fill = track.querySelector('div');
        const mark = track.querySelector('span');
        const pct = (e: Element | null, x: (b: DOMRect) => number) => (e ? Math.round((100 * x(e.getBoundingClientRect())) / track.getBoundingClientRect().width) : null);
        const norm = (t: string | null) => (t ?? '').replace(/\s/g, ' ');
        return {
          text: [head.children[0].textContent, norm(head.children[1].textContent), norm(status.textContent)],
          fill: pct(fill, b => b.width),
          mark: pct(mark, b => b.left + b.width / 2 - track.getBoundingClientRect().left),
        };
      }));
    await expect.poll(() => rows("Chiffre d'affaires")).toEqual([
      { text: ['Cette semaine', '4 311 € / 6 000 €', 'En avance · attendu à ce jour 3 420 €'], fill: 72, mark: 57 },
      { text: ['Ce mois', '812 € / 25 000 €', 'En retard · attendu à ce jour 1 650 €'], fill: 3, mark: 7 },
    ]);
    expect(await rows('Vente additionnelle · articles par ticket')).toEqual([
      { text: ['Cette semaine', '1,82 / 2,00', 'À atteindre · 452 tickets'], fill: 91, mark: null },
      { text: ['Ce mois', '2,05 / 2,00', 'Atteint · 1 890 tickets'], fill: 100, mark: null },
    ]);
    // Kept on the device for the next start (and offline).
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bv.obj') ?? '{}').payload)).toEqual(OBJECTIVES_PAYLOAD);

    await page.getByRole('button', { name: 'NL', exact: true }).click();
    await expect(page.getByText('Doelen', { exact: true })).toBeVisible();
    await expect(page.getByText(amount('4.311 € / 6.000 €'))).toBeVisible();
    await expect(page.getByText('Gehaald · 1.890 tickets', { exact: true })).toBeVisible();
  });

  test('a customer remark is posted to the BO', async ({ page }) => {
    await mockBo(page);
    const remarks = await mockRemarks(page);
    await page.goto('/?shop=4');
    const form = remarkForm(page);
    const send = form.getByRole('button', { name: 'Envoyer', exact: true });
    await expect(send).toBeDisabled();
    await form.getByRole('button', { name: 'Réclamation', exact: true }).click();
    await form.getByRole('textbox').fill('  Le pain gris était trop cuit ce matin.  ');
    await send.click();
    await expect(form.getByRole('status')).toHaveText('Merci ! La remarque est envoyée.');
    await expect(form.getByRole('textbox')).toHaveValue('');
    await expect(send).toBeDisabled();
    expect(remarks.received).toEqual([{
      id: expect.stringMatching(UUID_V4),
      shop: '4',
      type: 'reclamation',
      texte: 'Le pain gris était trop cuit ce matin.',
      langue: 'fr',
      saisieLe: expect.stringMatching(/^2\d{3}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/),
    }]);
    // Typed in Dutch: the BO is told so; every remark has its own id.
    await page.getByRole('button', { name: 'NL', exact: true }).click();
    const nl = page.getByRole('form', { name: 'Opmerking van een klant' });
    await nl.getByRole('button', { name: 'Compliment', exact: true }).click();
    await nl.getByRole('textbox').fill('Heel vriendelijk onthaal.');
    await nl.getByRole('button', { name: 'Versturen', exact: true }).click();
    await expect(nl.getByRole('status')).toHaveText('Bedankt! De opmerking is verstuurd.');
    expect(remarks.received[1]).toMatchObject({ type: 'compliment', texte: 'Heel vriendelijk onthaal.', langue: 'nl', shop: '4' });
    expect(remarks.received[1].id).not.toBe(remarks.received[0].id);
    expect(await page.evaluate(() => localStorage.getItem('bv.remarques'))).toBe('[]');
  });

  test('offline, a remark waits on the tablet and leaves when the network is back', async ({ page, context }) => {
    await mockBo(page);
    const remarks = await mockRemarks(page);
    await page.goto('/?shop=4');
    const form = remarkForm(page);
    await expect(form).toBeVisible();

    await context.setOffline(true);
    remarks.up = false;
    await form.getByRole('button', { name: 'Suggestion', exact: true }).click();
    await form.getByRole('textbox').fill('Des pistolets aux graines le dimanche.');
    await form.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(form.getByRole('status')).toHaveText('Gardée sur la tablette : elle partira dès que la connexion revient.');
    await expect(form.getByRole('textbox')).toHaveValue('');
    const waiting = await page.evaluate(() => JSON.parse(localStorage.getItem('bv.remarques') ?? '[]'));
    expect(waiting).toEqual([expect.objectContaining({ id: expect.stringMatching(UUID_V4), type: 'suggestion', texte: 'Des pistolets aux graines le dimanche.', shop: '4' })]);
    expect(remarks.received).toEqual([]);

    // The network comes back: the waiting remark leaves on its own, with the same id.
    remarks.up = true;
    await context.setOffline(false);
    await expect.poll(() => remarks.received).toEqual(waiting);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('bv.remarques'))).toBe('[]');
    // The waiting count on the form follows (refreshed every 5 s): nothing waits any more.
    await form.getByRole('textbox').fill('x');
    await expect(form.getByRole('status')).toHaveText("1 remarque en attente d'envoi.");
    await expect(form.locator('[role="status"]')).toHaveText('', { timeout: 10_000 });
  });

  test('a remark kept on the tablet leaves at the next start', async ({ page }) => {
    await mockBo(page);
    const remarks = await mockRemarks(page);
    const kept = {
      id: '0b6f8a52-3c1d-4e2f-9a7b-1c2d3e4f5a6b', shop: '4', type: 'compliment', texte: 'Gardée hier soir.', langue: 'fr', saisieLe: '2026-10-01T19:02:00+02:00',
    };
    await page.addInitScript(r => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('bv.remarques', JSON.stringify([r]));
      }
    }, kept);
    await page.goto('/?shop=4');
    await expect.poll(() => remarks.received).toEqual([kept]);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('bv.remarques'))).toBe('[]');
  });

});

test.describe('data from the back-office, offline', () => {
  test('the last BO book and its photos come from the device', async ({ page, context }) => {
    await page.goto(bo.base + '?shop=4');
    await expect(source(page)).toHaveText(/^BO · Ixelles/);
    // Deployed like in the BO: API and photos next to the app folder.
    expect(bo.asked).toContain('/consulant_bo/api/cockpit/tablette/book?shop=4');
    await waitForServiceWorker(page);
    // Through the worker now: the book is kept in 'bv-book'; the photos are downloaded in the
    // background into 'bv-photos' (src/data/warmPhotos.ts), even those never shown.
    await page.reload();
    await expect(source(page)).toHaveText(/^BO · Ixelles/);
    const cached = (name: string) => page.evaluate(async n => (await (await caches.open(n)).keys()).map(r => new URL(r.url).pathname), name);
    await expect.poll(() => cached('bv-book')).toEqual(['/consulant_bo/api/cockpit/tablette/book']);
    await expect.poll(async () => (await cached('bv-photos')).sort(), { timeout: 15_000 }).toEqual([
      '/consulant_bo/uploads/plano/panel/1610042.png', '/consulant_bo/uploads/tablette/1610006-640.jpg', '/consulant_bo/uploads/tablette/3300120-640.jpg',
    ]);

    // The book is also kept on the device (localStorage), for this link.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bv.book') ?? '{}').url)).toBe(bo.base.replace(/tablette\/$/, 'api/cockpit/tablette/book?shop=4'));

    // The shop's targets were asked next to the book and are kept on the device too.
    expect(bo.asked).toContain('/consulant_bo/api/cockpit/tablette/objectifs?shop=4');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('bv.obj') ?? '{}').url))
      .toBe(bo.base.replace(/tablette\/$/, 'api/cockpit/tablette/objectifs?shop=4'));

    // The BO goes away (connections dropped): the app starts at once on the book kept on the
    // device, still labelled with the BO and its date; the background refresh fails quietly.
    bo.up = false;
    await page.reload();
    await expect(source(page)).toHaveText(/^BO · Ixelles · 2 oct\.? 09[:h]12$/);
    // The home page shows the targets kept on the device.
    await expect(page.getByRole('main').getByText(amount('4 311 € / 6 000 €'))).toBeVisible();

    // The tablet goes offline too.
    await context.setOffline(true);
    // The installed app opens without ?shop=: the remembered shop's book is served from the cache.
    await page.goto(bo.base);
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await expect(source(page)).toHaveText(/^Hors ligne · données du 2 oct\.? 09[:h]12$/);
    await expect(page.getByRole('main').getByText(amount('2,05 / 2,00'))).toBeVisible();
    await openSection(page, 'La gamme');
    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: /Bûche pâtissière praliné/ })).toBeVisible();
    await expect.poll(() => loadedWidth(page, 'main', '/uploads/tablette/1610006-640.jpg')).toBe(PHOTO_SIZE);
    // a photo never displayed online, downloaded by the warm-up
    await expect.poll(() => loadedWidth(page, 'main', '/uploads/tablette/3300120-640.jpg')).toBe(PHOTO_SIZE);
    await context.setOffline(false);
    expect(bo.misses).toEqual([]);
  });
});
