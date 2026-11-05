import { test, expect, type Page } from '@playwright/test';
import { kits } from '../../src/data/kits';
import { noHorizontalOverflow, ready, tabTo, visibleFocus } from './helpers';

async function seed(page: Page, value: unknown) {
  await ready(page, '/');
  await page.evaluate(value => localStorage.setItem('launchpad.v1', JSON.stringify(value)), value);
  await page.reload();
}

async function noBookmarks(page: Page) {
  await expect(page.locator('a[href="/saved"], [data-testid^="button-save-"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /bookmark|save kit/i })).toHaveCount(0);
}

test('legacy progress resumes in catalogue order, independent of filters and bookmarks', async ({ page }, info) => {
  await seed(page, {
    saved: ['card-guard'],
    progress: {
      'spend-explorer': ['download', 'download', 'removed-step', 42, null],
      'interest-maximiser': ['node'],
      'card-guard': ['obsolete'],
      'unknown-kit': ['download'],
      broken: { download: true },
    },
  });
  await noBookmarks(page);
  if (info.project.name !== 'desktop') {
    await page.getByTestId('button-mobile-nav').click();
    await noBookmarks(page);
    await expect(page.getByRole('navigation', { name: 'Primary mobile' }).getByRole('link')).toHaveCount(3);
    await page.getByTestId('button-mobile-nav').click();
  }
  const resume = page.getByTestId('section-resume');
  await expect(resume.getByRole('link')).toHaveText([
    /Interest Maximiser.*1\/6 ticked by you/,
    /Spend Explorer.*1\/5 ticked by you/,
  ]);
  await expect(page.getByTestId('progress-spend-explorer')).toHaveAttribute('aria-valuenow', '1');
  await noHorizontalOverflow(page);
  await page.getByTestId('input-search').fill('no-such-kit');
  await expect(page.getByTestId('empty-search')).toBeVisible();
  await expect(resume.getByRole('link')).toHaveCount(2);
  await page.getByTestId('select-sort').selectOption('time');
  const link = page.getByTestId('link-continue-spend-explorer');
  await expect(link).toHaveAttribute('href', '/kits/spend-explorer#run');
  await tabTo(page, link);
  await visibleFocus(link);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/kits\/spend-explorer#run$/);
  await expect.poll(() => page.locator('#run').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(200);
  await noBookmarks(page);
  await expect(page.getByTestId('text-progress')).toHaveText('1/5');
  const download = page.getByTestId('checkbox-step-download');
  await expect(download).toHaveAttribute('aria-pressed', 'true');
  await tabTo(page, download);
  await visibleFocus(download);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('text-progress')).toHaveText('0/5');
  await page.reload();
  await expect(download).toHaveAttribute('aria-pressed', 'false');
  await download.click();
  await page.getByTestId('checkbox-step-run').click();
  await page.reload();
  await expect(page.getByTestId('text-progress')).toHaveText('2/5');
  await ready(page, '/');
  await expect(page.getByTestId('link-continue-spend-explorer')).toContainText('2/5');
  await page.getByTestId('link-continue-spend-explorer').click();
  await page.getByTestId('button-reset-progress').click();
  await page.reload();
  await expect(page.getByTestId('text-progress')).toHaveText('0/5');
  await ready(page, '/');
  await expect(resume.getByRole('link')).toHaveCount(1);
  await expect(page.getByTestId('link-continue-interest-maximiser')).toContainText('1/6');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('launchpad.v1')!));
  expect(stored.progress['interest-maximiser']).toEqual(['node']);
  expect(stored.progress['unknown-kit']).toEqual(['download']);
});

test('completed, untouched, stale-only and malformed progress do not create resume links', async ({ page }) => {
  const complete = kits.find(kit => kit.slug === 'spend-explorer')!;
  await seed(page, {
    saved: ['interest-maximiser'],
    progress: {
      [complete.slug]: [...complete.checklist.map(step => step.id), 'obsolete', 'download'],
      'interest-maximiser': ['obsolete'],
      'card-guard': 'download',
      unknown: ['download'],
    },
  });
  await expect(page.getByTestId('section-resume')).toHaveCount(0);
  await expect(page.getByTestId('progress-spend-explorer')).toHaveAttribute('aria-valuenow', '5');
  await ready(page, '/kits/spend-explorer');
  await expect(page.getByTestId('text-progress')).toHaveText('5/5');
  await page.reload();
  await expect(page.getByTestId('text-progress')).toHaveText('5/5');
  await page.getByTestId('button-reset-progress').click();
  await ready(page, '/');
  await expect(page.getByTestId('section-resume')).toHaveCount(0);
  await expect(page.getByTestId('progress-spend-explorer')).toHaveCount(0);
  for (const value of [null, [], { progress: [] }, { progress: null }]) {
    await seed(page, value);
    await expect(page.getByTestId('section-resume')).toHaveCount(0);
    await expect(page.getByTestId('card-kit-spend-explorer')).toBeVisible();
  }
});

test('old Saved URLs redirect to the library without losing progress', async ({ page }) => {
  await seed(page, { saved: ['spend-explorer'], progress: { 'spend-explorer': ['download'] } });
  await ready(page, '/saved');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('link-continue-spend-explorer')).toContainText('1/5');
  await noBookmarks(page);
  await page.reload();
  await expect(page.getByTestId('link-continue-spend-explorer')).toContainText('1/5');
});
