import { test, expect } from '@playwright/test';
import { noHorizontalOverflow } from '../responsive/helpers';

test.beforeEach(async ({ page, baseURL }) => {
  page.on('pageerror', error => { throw error; });
  page.on('request', request => {
    if (!request.url().startsWith('http')) return;
    expect(request.url().startsWith(baseURL!)).toBe(true);
    expect(['fetch', 'xhr', 'websocket']).not.toContain(request.resourceType());
  });
});

test('new kits are searchable and category filtering includes accounting', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('text-result-count')).toHaveText('9 of 9 kits');
  await page.getByTestId('filter-category-accounting').click();
  await expect(page.getByTestId('card-kit-who-paid')).toBeVisible();
  await expect(page.locator('[data-testid^="card-kit-"]')).toHaveCount(1);
  await page.getByTestId('filter-category-all').click();
  await page.getByRole('searchbox', { name: 'Search kits' }).fill('Randall');
  await expect(page.locator('[data-testid^="card-kit-"]')).toHaveCount(2);
});

for (const width of [320, 390, 1440]) {
  test(`new demo calculations, invalid inputs and reset at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('kits/cashflow-runway#try');
    await expect(page.getByTestId('summary-scenario')).toContainText('R 1 000.00');
    await page.getByTestId('input-runway-purchase').fill('5000');
    await expect(page.getByTestId('summary-scenario')).toContainText('-R 4 000.00');
    await expect(page.getByTestId('summary-scenario')).toContainText('2026-11-10');
    await page.getByTestId('toggle-runway-days').click();
    await expect(page.locator('tbody tr')).toHaveCount(30);
    await noHorizontalOverflow(page);
    await page.getByTestId('input-runway-purchase').fill('1.001');
    await expect(page.getByTestId('error-runway-purchase')).toBeVisible();
    await expect(page.getByTestId('summary-scenario')).toHaveCount(0);
    await page.getByTestId('button-reset-demo').click();
    await expect(page.getByTestId('input-runway-purchase')).toHaveValue('0.00');
    await expect(page.getByTestId('summary-scenario')).toContainText('R 1 000.00');
    await expect(page.getByTestId('link-official-sandbox')).toHaveAttribute('href', /developer\.investec\.com/);

    await page.goto('kits/recurring-payment-detective#try');
    const gym = page.getByTestId('recurring-demo-gym');
    await expect(gym).toContainText('2026-11-30');
    await page.getByTestId('input-recurring-gym').fill('699');
    await expect(gym).toContainText('Amounts vary');
    await page.getByTestId('checkbox-exclude-pending').check();
    await expect(page.getByTestId('text-ignored')).toContainText('0 row(s)');
    await noHorizontalOverflow(page);
    await page.getByTestId('input-recurring-gym').fill('');
    await expect(page.getByTestId('error-recurring-gym')).toHaveText('Required');
    await page.getByTestId('button-reset-demo').click();
    await expect(gym).toContainText('2026-11-30');

    await page.goto('kits/who-paid#try');
    await expect(page.getByTestId('invoice-inv-2')).toContainText('partial');
    await expect(page.getByTestId('invoice-inv-2')).toContainText('overdue');
    await page.getByTestId('input-recon-pay2').fill('3000');
    await expect(page.getByTestId('invoice-inv-2')).not.toContainText('overdue');
    await page.getByTestId('input-recon-ref').fill('SHARED');
    await expect(page.getByTestId('payment-pay-3')).toContainText('ambiguous');
    await expect(page.getByTestId('invoice-inv-4')).toContainText('unpaid');
    await noHorizontalOverflow(page);
    await page.getByTestId('input-recon-pay2').fill('-1');
    await expect(page.getByTestId('error-recon-pay2')).toBeVisible();
    await page.getByTestId('button-reset-demo').click();
    await expect(page.getByTestId('invoice-inv-2')).toContainText('partial');
    await expect(page.getByTestId('payment-pay-3')).toContainText('unmatched');
  });
}
