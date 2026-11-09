import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test('library filters survive reload and browser back from a kit', async ({ page }) => {
  await ready(page, '/?campaign=community&lang=JavaScript');
  const initialHistoryLength = await page.evaluate(() => history.length);

  await page.getByRole('searchbox', { name: 'Search kits' }).fill('spend');
  await page.getByTestId('filter-category-insights').click();
  await page.getByTestId('filter-difficulty-beginner').click();
  await page.getByLabel('Sort kits').selectOption('time');

  await expect.poll(() => page.evaluate(() => history.length)).toBe(initialHistoryLength);
  await expect.poll(() => page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)))).toEqual({
    campaign: 'community',
    q: 'spend',
    cat: 'Insights',
    lang: 'JavaScript',
    diff: 'Beginner',
    sort: 'time',
  });
  // "spend" + Insights + Beginner matches Spend Explorer and Cashflow Runway ("daily spending" in its summary).
  const matchingKits = ['card-kit-spend-explorer', 'card-kit-cashflow-runway'];
  for (const id of matchingKits) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.locator('[data-testid^="card-kit-"]')).toHaveCount(matchingKits.length);
  await expect(page.getByTestId('text-result-count')).toHaveText(/^2 of \d+ kits$/);

  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Search kits' })).toHaveValue('spend');
  await expect(page.getByTestId('filter-category-insights')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('filter-difficulty-beginner')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sort kits')).toHaveValue('time');
  await expect.poll(() => page.evaluate(() => new URLSearchParams(location.search).get('lang'))).toBe('JavaScript');
  for (const id of matchingKits) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.locator('[data-testid^="card-kit-"]')).toHaveCount(matchingKits.length);

  await page.getByTestId('link-kit-spend-explorer').click();
  await expect(page).toHaveURL(/\/kits\/spend-explorer$/);
  await page.goBack();

  await expect(page).toHaveURL(/\/\?campaign=community&.*q=spend/);
  await expect(page.getByRole('searchbox', { name: 'Search kits' })).toHaveValue('spend');
  await expect(page.getByTestId('filter-category-insights')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('filter-difficulty-beginner')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sort kits')).toHaveValue('time');
  await expect.poll(() => page.evaluate(() => new URLSearchParams(location.search).get('lang'))).toBe('JavaScript');
});

test('direct links accept valid values and normalize invalid filters to defaults', async ({ page }) => {
  await ready(page, '/?campaign=community&q=spend&cat=bad&lang=Python&diff=Expert&sort=random');

  await expect(page.getByRole('searchbox', { name: 'Search kits' })).toHaveValue('spend');
  await expect(page.getByTestId('filter-category-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('filter-difficulty-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sort kits')).toHaveValue('name');
  await expect.poll(() => page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)))).toEqual({
    campaign: 'community',
    q: 'spend',
  });
});

test('back and forward restore filters for history entries on the same library route', async ({ page }) => {
  await ready(page, '/?campaign=community&q=spend#kits');
  const search = page.getByRole('searchbox', { name: 'Search kits' });
  await expect(search).toHaveValue('spend');
  await page.evaluate(() => history.pushState(null, '', '/?campaign=community&q=guard#kits'));

  await page.goBack();
  await expect(search).toHaveValue('spend');
  await page.goForward();
  await expect(search).toHaveValue('guard');
  await expect(page.getByTestId('card-kit-card-guard')).toBeVisible();
  await expect(page).toHaveURL(/campaign=community&q=guard#kits$/);

  await page.goBack();
  await expect(search).toHaveValue('spend');
  await expect(page.getByTestId('card-kit-spend-explorer')).toBeVisible();
  await expect(page).toHaveURL(/campaign=community&q=spend#kits$/);
});
