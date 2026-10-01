import { expect, test } from '@playwright/test';
import { mainNav, openSection, pageTitle } from './helpers';

test.describe('smoke', () => {
  test('loads the home page in French', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle("Book vendeuses — L'Atelier By");
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await expect(page.getByRole('img', { name: "L'Atelier By" })).toBeVisible();
  });

  test('switches the interface to Dutch and back', async ({ page }) => {
    await page.goto('/');
    const fr = page.getByRole('button', { name: 'FR', exact: true });
    const nl = page.getByRole('button', { name: 'NL', exact: true });
    await expect(fr).toHaveAttribute('aria-pressed', 'true');
    await nl.click();
    await expect(pageTitle(page, 'Goedendag!')).toBeVisible();
    await expect(page.getByText('Bonjour !')).toHaveCount(0);
    await expect(mainNav(page).getByRole('button', { name: 'Assortiment', exact: true })).toBeVisible();
    await expect(nl).toHaveAttribute('aria-pressed', 'true');
    await expect(fr).toHaveAttribute('aria-pressed', 'false');
    // Screen readers switch to Dutch pronunciation.
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

    await fr.click();
    await expect(pageTitle(page, 'Bonjour !')).toBeVisible();
    await expect(mainNav(page).getByRole('button', { name: 'La gamme', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('opens in Dutch with ?lang=nl', async ({ page }) => {
    await page.goto('/?lang=nl');
    await expect(pageTitle(page, 'Goedendag!')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  });

  const SHEETS = [
    { lang: 'FR', query: '', section: 'La gamme', title: 'La gamme', product: 'Croissant pur beurre', close: 'Fermer' },
    { lang: 'NL', query: '?lang=nl', section: 'Assortiment', title: 'Het assortiment', product: 'Croissant met roomboter', close: 'Sluiten' },
  ];
  for (const t of SHEETS) {
    test(`opens and closes a product sheet from the range (${t.lang})`, async ({ page }) => {
      await page.goto('/' + t.query);
      await openSection(page, t.section);
      await expect(pageTitle(page, t.title)).toBeVisible();

      await page.getByRole('main').getByRole('button', { name: t.product }).first().click();
      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('heading', { name: t.product, exact: true })).toBeVisible();

      await sheet.getByRole('button', { name: t.close, exact: true }).click();
      await expect(sheet).toBeHidden();
      await expect(pageTitle(page, t.title)).toBeVisible();
    });
  }
});

test.describe('layout', () => {
  test('portrait: header and bottom tab bar, no sidebar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'portrait', 'portrait layout only');
    await page.goto('/');
    const tabs = mainNav(page);
    await expect(tabs).toBeVisible();
    for (const label of ['Accueil', 'La gamme', 'Allergènes', 'FAQ', 'Plus']) {
      await expect(tabs.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    // Fixed to the bottom edge, full width.
    const viewport = page.viewportSize()!;
    const box = (await tabs.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(viewport.height);
    expect(Math.round(box.width)).toBe(viewport.width);
    await expect(page.getByRole('complementary')).toHaveCount(0);

    // "Plus" opens the sheet with the other sections.
    await tabs.getByRole('button', { name: 'Plus', exact: true }).click();
    const more = page.getByRole('dialog');
    await expect(more).toBeVisible();
    await more.getByRole('button', { name: 'Saisons' }).click();
    await expect(pageTitle(page, 'Saisons')).toBeVisible();
    await expect(more).toBeHidden();
  });

  test('landscape: sidebar navigation, no tab bar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'landscape', 'landscape layout only');
    await page.goto('/');
    const sidebar = page.getByRole('complementary');
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(sidebar.getByRole('navigation').getByRole('button', { name: 'Onboarding', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plus', exact: true })).toHaveCount(0);
  });
});
