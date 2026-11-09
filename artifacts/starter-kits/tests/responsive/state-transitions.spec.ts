import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test('Card Guard only shows a decision for the current purchase and rules', async ({ page }) => {
  await ready(page, '/kits/card-guard');
  const simulate = page.getByTestId('button-simulate');
  const decision = page.getByTestId('status-decision');
  const stale = page.getByTestId('status-decision-stale');
  const gambling = page.getByTestId('toggle-block-Gambling');

  await expect(decision).toHaveCount(0);
  await expect(stale).toHaveCount(0);
  await simulate.click();
  await expect(decision).toContainText('APPROVE');

  await page.getByTestId('input-amount').fill('2000');
  await expect(decision).toHaveCount(0);
  await expect(stale).toContainText('Run the simulation again');
  await simulate.click();
  await expect(decision).toContainText('DECLINE');
  await expect(decision).toContainText('exceeds limit');

  await page.getByTestId('input-limit').fill('invalid');
  await expect(decision).toHaveCount(0);
  await expect(simulate).toBeDisabled();
  await page.getByTestId('input-limit').fill('2500');
  await expect(stale).toBeVisible();
  await simulate.click();
  await expect(decision).toContainText('APPROVE');

  await page.getByTestId('select-merchant').selectOption({ label: 'Gambling' });
  await expect(decision).toHaveCount(0);
  await simulate.click();
  await expect(decision).toContainText('DECLINE');
  await expect(decision).toContainText('restricted');
  await expect(gambling).toHaveAttribute('aria-pressed', 'true');
  await gambling.click();
  await expect(gambling).toHaveAttribute('aria-pressed', 'false');
  await expect(decision).toHaveCount(0);
  await expect(stale).toBeVisible();
  await simulate.click();
  await expect(decision).toContainText('APPROVE');
  await expect(stale).toHaveCount(0);

  await page.reload();
  await expect(decision).toHaveCount(0);
  await expect(stale).toHaveCount(0);
});

test('Interest Maximiser reports unsupported amounts without crashing the route', async ({ page }) => {
  await ready(page, '/kits/interest-maximiser');
  for (const id of ['balance', 'pending', 'reserve']) {
    const input = page.getByTestId(`input-${id}`);
    const original = await input.inputValue();
    await input.fill('90071992547410');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId(`error-${id}`)).toContainText('outside the supported range');
    await expect(page.getByTestId('text-demo-invalid')).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await input.fill(original);
    await expect(page.getByTestId('text-transferable')).toBeVisible();
  }

  const balance = page.getByTestId('input-balance');
  await balance.fill('90071992547409');
  await expect(page.getByTestId('text-transferable')).toBeVisible();
  await expect(balance).toHaveAttribute('aria-invalid', 'false');
  await balance.fill('1e100');
  await expect(page.getByTestId('error-balance')).toContainText('outside the supported range');
});

test('mobile navigation closes after using the home link', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'The mobile navigation is hidden on desktop.');
  await ready(page, '/kits/card-guard');
  const toggle = page.getByTestId('button-mobile-nav');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId('link-home').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Primary mobile' })).toHaveCount(0);

  await toggle.click();
  await page.getByTestId('link-home').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.getByTestId('link-hero-getting-started').click();
  await toggle.click();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
