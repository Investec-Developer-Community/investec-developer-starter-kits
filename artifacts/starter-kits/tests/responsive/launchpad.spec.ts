import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { noHorizontalOverflow, ready, tabTo, visibleFocus } from './helpers';

const sectionScreenshotStyle = fileURLToPath(new URL('./section-screenshot.css', import.meta.url));

test('zebra footer remains readable and restrained', async ({ page }) => {
  await ready(page, '/');
  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(page.getByTestId('image-footer-zebra')).toBeVisible();
  await noHorizontalOverflow(page);
  await expect(footer).toHaveScreenshot('zebra-footer.png');
});

test('library shell, filters and keyboard focus', async ({ page }, info) => {
  await ready(page, '/');
  await noHorizontalOverflow(page);
  const mobile = info.project.name !== 'desktop';
  await expect(page.getByRole('navigation', { name: 'Primary', exact: true })).toBeVisible({ visible: !mobile });
  await expect(page.getByTestId('button-mobile-nav')).toBeVisible({ visible: mobile });
  await expect(page).toHaveScreenshot('library.png');
  const home = page.getByTestId('link-home');
  await tabTo(page, home);
  await visibleFocus(home);
  await expect(page.locator('body > #root header').first()).toHaveScreenshot('shell-focus.png');
  const search = page.getByRole('searchbox', { name: 'Search kits' });
  await tabTo(page, search);
  await visibleFocus(search);
  await page.keyboard.type('no-such-kit');
  await expect(page.getByTestId('empty-search')).toBeVisible();
  await noHorizontalOverflow(page);
  await tabTo(page, page.getByTestId('select-sort'));
  await visibleFocus(page.getByTestId('select-sort'));
  await tabTo(page, page.getByTestId('filter-category-all'));
  await visibleFocus(page.getByTestId('filter-category-all'));
  await tabTo(page, page.getByTestId('button-reset-filters'));
  await visibleFocus(page.getByTestId('button-reset-filters'));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('empty-search')).toHaveCount(0);
});

test('navigation can be opened, closed and followed using only the keyboard', async ({ page }, info) => {
  await ready(page, '/');
  if (info.project.name === 'desktop') {
    const link = page.getByTestId('link-nav-getting-started');
    await tabTo(page, link);
    await visibleFocus(link);
    await page.keyboard.press('Enter');
    await expect(link).toHaveAttribute('aria-current', 'page');
  } else {
    const toggle = page.getByTestId('button-mobile-nav');
    const nav = page.getByRole('navigation', { name: 'Primary mobile' });
    await expect(toggle).toHaveAttribute('aria-controls', 'mobile-nav');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await tabTo(page, toggle);
    await visibleFocus(toggle);
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();
    await noHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('mobile-menu.png');
    await page.keyboard.press('Space');
    await expect(nav).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-mobile-nav-library')).toBeFocused();
    await expect(page.getByTestId('link-mobile-nav-library')).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Tab');
    await visibleFocus(page.getByTestId('link-mobile-nav-getting-started'));
    await page.keyboard.press('Enter');
    await expect(nav).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  }
  await expect(page).toHaveURL(/\/getting-started$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('button-download-bundle')).toBeVisible();
});

for (const slug of ['spend-explorer', 'card-guard', 'interest-maximiser']) {
  test(`kit layout stays contained: ${slug}`, async ({ page }) => {
    await ready(page, `/kits/${slug}`);
    await noHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(`kit-${slug}.png`);
    await tabTo(page, page.getByTestId('link-back'));
    await visibleFocus(page.getByTestId('link-back'));
  });
}

test('mapping panels, code scrolling and disclosure keyboard behavior', async ({ page }) => {
  await ready(page, '/reference');
  const guide = page.getByTestId('section-api-mappings');
  const summary = guide.locator('summary').first();
  await tabTo(page, summary);
  await visibleFocus(summary);
  await expect(guide).toHaveScreenshot('api-mappings.png', {
    stylePath: sectionScreenshotStyle,
  });
  await page.keyboard.press('Enter');
  await expect(guide.locator('details').first()).not.toHaveAttribute('open');
  await noHorizontalOverflow(page);
  await page.keyboard.press('Space');
  await expect(guide.locator('details').first()).toHaveAttribute('open', '');
  const code = guide.locator('pre').first();
  await page.keyboard.press('Tab');
  await visibleFocus(code);
  for (const pre of await guide.locator('pre').all()) {
    expect(await pre.evaluate(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX))).toBe(true);
  }
  const requestCode = guide.locator('pre').nth(1);
  await tabTo(page, requestCode);
  await visibleFocus(requestCode);
  expect(await requestCode.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => requestCode.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  const scenarioButton = page.getByTestId('button-check-scenarios');
  await tabTo(page, scenarioButton);
  await visibleFocus(scenarioButton);
  await page.keyboard.press('Enter');
  const results = page.getByTestId('scenario-check-results');
  await expect(results.locator('li')).toHaveCount(6);
  await expect(results.locator('strong')).toHaveText(Array(6).fill('PASS'));
  await noHorizontalOverflow(page);
});

test('onboarding instructions and links remain readable and reachable', async ({ page }) => {
  await ready(page, '/getting-started');
  await noHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('onboarding.png');
  const simulator = page.getByTestId('section-simulator');
  await simulator.scrollIntoViewIfNeeded();
  await expect(simulator).toHaveScreenshot('onboarding-simulator.png', {
    stylePath: sectionScreenshotStyle,
  });
  const repo = page.getByTestId('link-simulator-repo');
  await tabTo(page, repo);
  await visibleFocus(repo);
  await tabTo(page, page.getByTestId('link-start-beginner'));
  await visibleFocus(page.getByTestId('link-start-beginner'));
});
