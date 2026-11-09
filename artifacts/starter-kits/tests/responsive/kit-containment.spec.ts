import { test, expect, type Page } from '@playwright/test';
import { kits } from '../../src/data/kits';
import { pingerTxns } from '../../src/data/community-kits';
import { noHorizontalOverflow, operateDemo, ready, tabTo, visibleFocus } from './helpers';

// Non-screenshot containment for every kit page; runs at 320, 390 and 1440 via the projects.
async function keyElementsInsideViewport(page: Page, slug: string) {
  const width = page.viewportSize()!.width;
  for (const testId of ['link-back', 'text-kit-name', 'text-outcome', 'text-prereqs', 'link-try-demo', 'link-run-locally',
    'section-starter-files', 'button-download-bundle', 'button-download-script', 'button-download-data', 'text-progress']) {
    const element = page.getByTestId(testId).first();
    await expect(element, `${slug}: ${testId}`).toBeVisible();
    const box = (await element.boundingBox())!;
    expect(box.x, `${slug}: ${testId} left edge at ${width}px`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${slug}: ${testId} right edge at ${width}px`).toBeLessThanOrEqual(width + 1);
  }
  for (const id of ['try', 'run', 'api-notes', 'sources']) {
    const box = (await page.locator(`section#${id}`).boundingBox())!;
    expect(box, `${slug}: section #${id}`).not.toBeNull();
    expect(box.x, `${slug}: #${id} left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${slug}: #${id} right edge at ${width}px`).toBeLessThanOrEqual(width + 1);
  }
}

for (const kit of kits) {
  test(`kit page stays contained before and after operating its demo: ${kit.slug}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await ready(page, `/kits/${kit.slug}`);
    await expect(page.getByTestId('text-kit-name')).toHaveText(kit.name);
    await noHorizontalOverflow(page);
    await keyElementsInsideViewport(page, kit.slug);

    expect(await operateDemo(page), `${kit.slug} demo has operable controls`).toBeGreaterThan(0);
    await noHorizontalOverflow(page);
    await keyElementsInsideViewport(page, kit.slug);
    expect(errors).toEqual([]);
  });
}

// Keyboard operation of the community demos (kits 4-6).
test('Payment Pinger presets and fields are operable by keyboard', async ({ page }) => {
  await ready(page, '/kits/payment-pinger');
  const merchant = page.getByTestId('input-merchant');
  const first = page.getByTestId('button-preset-0');
  await tabTo(page, first);
  await visibleFocus(first);
  await page.keyboard.press('Enter');
  await expect(merchant).toHaveValue(pingerTxns[0]!.merchant);
  await expect(page.getByTestId('text-ping-preview')).toContainText(pingerTxns[0]!.merchant);
  await page.keyboard.press('Tab');
  await visibleFocus(page.getByTestId('button-preset-1'));
  await page.keyboard.press('Space');
  await expect(merchant).toHaveValue(pingerTxns[1]!.merchant);
  await expect(page.getByTestId('text-ping-alert')).toBeVisible();
  const invalid = page.getByTestId(`button-preset-${pingerTxns.length - 1}`);
  await tabTo(page, invalid);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('text-demo-invalid')).toBeVisible();
  await tabTo(page, merchant);
  await visibleFocus(merchant);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Keyboard Cafe');
  await tabTo(page, page.getByTestId('input-amount'));
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('12');
  await tabTo(page, page.getByTestId('input-currency'));
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('ZAR');
  await tabTo(page, page.getByTestId('input-last4'));
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('4821');
  await expect(page.getByTestId('text-ping-preview')).toContainText('Keyboard Cafe');
  await noHorizontalOverflow(page);
});

test('Card-To-Sheet-Sync table, add row and export are operable by keyboard', async ({ page }) => {
  await ready(page, '/kits/card-to-sheet-sync');
  const table = page.getByRole('region', { name: 'Spreadsheet preview' });
  await tabTo(page, table);
  await visibleFocus(table);
  const rows = page.locator('[data-testid^="row-sheet-"]');
  const count = await rows.count();
  const add = page.getByTestId('button-add-row');
  await tabTo(page, add);
  await visibleFocus(add);
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(count + 1);
  await page.keyboard.press('Space');
  await expect(rows).toHaveCount(count + 2);
  const exportCsv = page.getByTestId('button-export-csv');
  await page.keyboard.press('Tab');
  await visibleFocus(exportCsv);
  const download = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  expect((await download).suggestedFilename()).toBe('card-to-sheet-sync.csv');
  await page.keyboard.press('Tab');
  await visibleFocus(page.getByTestId('button-reset-rows'));
  await page.keyboard.press('Space');
  await expect(rows).toHaveCount(count);
  await noHorizontalOverflow(page);
});

test("Swipe 'n Save percentage is operable by keyboard and reports invalid input", async ({ page }) => {
  await ready(page, '/kits/swipe-n-save');
  const percent = page.getByTestId('input-percent');
  await tabTo(page, percent);
  await visibleFocus(percent);
  const total = page.getByTestId('text-swipe-total');
  const before = await total.textContent();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('25');
  await expect(total).not.toHaveText(before!);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('abc');
  await expect(page.getByTestId('text-demo-invalid')).toBeVisible();
  await expect(total).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('10');
  await expect(total).toHaveText(before!);
  await noHorizontalOverflow(page);
});
