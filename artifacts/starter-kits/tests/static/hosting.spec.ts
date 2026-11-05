import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { kits } from '../../src/data/kits';

test.beforeEach(async ({ page, baseURL }) => {
  page.on('pageerror', error => { throw error; });
  page.on('request', request => {
    if (!request.url().startsWith('http')) return;
    expect(request.url().startsWith(baseURL!), `Unexpected request: ${request.url()}`).toBe(true);
    expect(['fetch', 'xhr', 'websocket']).not.toContain(request.resourceType());
  });
});

for (const route of ['', 'getting-started', 'reference', ...kits.map(k => `kits/${k.slug}`)]) {
  test(`direct load, refresh and assets: /${route}`, async ({ page, request }) => {
    expect((await page.goto(route || './'))?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    const kit = kits.find(k => route === `kits/${k.slug}`);
    if (kit) await expect(page.getByTestId('text-kit-name')).toHaveText(kit.name);
    expect((await page.reload())?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    for (const asset of await page.locator('script[src],link[rel="stylesheet"],link[rel="icon"],link[rel="apple-touch-icon"],img[src]').evaluateAll(
      els => els.map(el => (el as HTMLScriptElement).src || (el as HTMLLinkElement).href),
    )) {
      const response = await request.get(asset);
      expect(response.status(), asset).toBe(200);
      expect(response.headers()['content-type']).not.toContain('text/html');
    }
  });
}

test('anchors, client navigation, saved redirect and unknown routes', async ({ page, baseURL }) => {
  await page.goto('kits/spend-explorer#run');
  await expect(page.locator('#h-run')).toBeInViewport();
  await page.reload();
  await expect(page.locator('#h-run')).toBeInViewport();
  await page.getByTestId('link-nav-api-reference').click();
  await page.getByTestId('link-ref-account-mapping').click();
  await expect(page.locator('#account-mapping')).toBeInViewport();
  await page.reload();
  await expect(page.locator('#account-mapping')).toBeInViewport();
  await page.getByTestId('link-nav-getting-started').click();
  await page.getByTestId('link-start-beginner').click();
  await expect(page.locator('#h-try')).toBeInViewport();
  await page.goto('saved');
  await expect(page).toHaveURL(baseURL!);
  expect((await page.goto('unknown/nested/path'))?.status()).toBe(404);
  await expect(page.getByText('This page could not be found.')).toBeVisible();
  await page.getByTestId('link-home-404').click();
  await expect(page).toHaveURL(baseURL!);
  expect((await page.goto('kits/unknown-kit'))?.status()).toBe(404);
  await expect(page.getByTestId('kit-not-found')).toBeVisible();
});

test('ZIP downloads, copying and manual progress remain local', async ({ page }) => {
  for (const kit of kits) {
    await page.goto(`kits/${kit.slug}`);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('button-download-bundle').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${kit.slug}-starter.zip`);
    const bytes = await readFile((await download.path())!);
    expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
    for (const filename of [kit.scriptFile, kit.dataFile, 'README.md']) expect(bytes.includes(Buffer.from(filename))).toBe(true);
    await expect(page.getByTestId('text-progress')).toHaveText(`0/${kit.checklist.length}`);
  }
  await page.goto('kits/spend-explorer#run');
  await page.getByTestId('button-copy-command').first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('node spend-explorer.mjs');
  await page.getByTestId('checkbox-step-run').click();
  await page.reload();
  await expect(page.getByTestId('checkbox-step-run')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('link-home').click();
  await expect(page.getByTestId('section-resume')).toBeVisible();
});

test('all six interactive demos work without a backend', async ({ page }) => {
  await page.goto('kits/interest-maximiser#try');
  await page.getByTestId('input-reserve').fill('0');
  await expect(page.getByTestId('text-transferable')).toContainText('16');
  await page.goto('kits/spend-explorer#try');
  await page.getByTestId('input-demo-search').fill('Bolt');
  await expect(page.locator('[data-testid^="row-tx-"]')).toHaveCount(1);
  await page.goto('kits/card-guard#try');
  await page.getByTestId('button-simulate').click();
  await expect(page.getByTestId('status-decision')).toBeVisible();
  await page.goto('kits/payment-pinger#try');
  await page.getByTestId('input-merchant').fill('Static hosting test');
  await expect(page.getByTestId('text-ping-preview')).toContainText('Static hosting test');
  await page.goto('kits/card-to-sheet-sync#try');
  const rows = page.locator('[data-testid^="row-sheet-"]');
  const count = await rows.count();
  await page.getByTestId('button-add-row').click();
  await expect(rows).toHaveCount(count + 1);
  await page.goto('kits/swipe-n-save#try');
  const before = await page.getByTestId('text-swipe-total').textContent();
  await page.getByTestId('input-percent').fill('20');
  await expect(page.getByTestId('text-swipe-total')).not.toHaveText(before!);
});
