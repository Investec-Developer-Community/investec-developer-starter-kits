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

test('unavailable storage keeps multiple changes in memory and explains the risk', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (this: Storage, key) {
      if (key === 'launchpad.v1') throw new DOMException('Denied', 'SecurityError');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (this: Storage, key, value) {
      if (key === 'launchpad.v1') throw new DOMException('Denied', 'SecurityError');
      return setItem.call(this, key, value);
    };
  });
  await ready(page, '/kits/spend-explorer');
  await expect(page.getByTestId('storage-warning')).toContainText('lost');
  await page.getByTestId('checkbox-step-download').click();
  await page.getByTestId('checkbox-step-run').click();
  await expect(page.getByTestId('text-progress')).toHaveText('2/5');
  await noHorizontalOverflow(page);
  await page.getByTestId('link-back').click();
  await expect(page.getByTestId('storage-warning')).toContainText('lost');
  await expect(page.getByTestId('link-continue-spend-explorer')).toContainText('2/5');
  await noHorizontalOverflow(page);
  await page.getByTestId('link-continue-spend-explorer').click();
  await expect(page.getByTestId('text-progress')).toHaveText('2/5');
});

test('retry merges unsaved changes with the latest browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    setItem.call(localStorage, 'launchpad.v1', JSON.stringify({
      progress: { 'spend-explorer': ['download'], 'other-kit': ['keep'] },
    }));
    let blocked = true;
    Storage.prototype.setItem = function (this: Storage, key, value) {
      if (key === 'launchpad.v1' && blocked) throw new DOMException('Full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
    window.addEventListener('test:allow-checklist-storage', () => { blocked = false; });
  });
  await ready(page, '/kits/spend-explorer');
  await page.getByTestId('checkbox-step-run').click();
  await page.getByTestId('checkbox-step-filter').click();
  await expect(page.getByTestId('text-progress')).toHaveText('3/5');
  await expect(page.getByTestId('storage-warning')).toContainText('lost');

  const other = await page.context().newPage();
  await ready(other, '/');
  await other.evaluate(() => localStorage.setItem('launchpad.v1', JSON.stringify({
    progress: { 'spend-explorer': ['download', 'extend'], 'other-kit': ['keep', 'new'] },
  })));
  await expect(page.getByTestId('checkbox-step-extend')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('text-progress')).toHaveText('4/5');

  await page.evaluate(() => window.dispatchEvent(new Event('test:allow-checklist-storage')));
  await page.getByRole('button', { name: 'Retry browser storage' }).click();
  await expect(page.getByTestId('storage-warning')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('launchpad.v1')!));
  expect(stored.progress['spend-explorer']).toEqual(['download', 'extend', 'run', 'filter']);
  expect(stored.progress['other-kit']).toEqual(['keep', 'new']);
  await expect(other.getByTestId('link-continue-spend-explorer')).toContainText('4/5');
  await other.close();
});

test('checklist changes and resets update other tabs using the same browser storage', async ({ page }) => {
  await ready(page, '/kits/spend-explorer');
  const other = await page.context().newPage();
  await ready(other, '/kits/spend-explorer');
  await page.getByTestId('checkbox-step-download').click();
  await expect(other.getByTestId('text-progress')).toHaveText('1/5');
  await other.getByTestId('checkbox-step-run').click();
  await expect(page.getByTestId('text-progress')).toHaveText('2/5');
  await other.getByTestId('button-reset-progress').click();
  await expect(page.getByTestId('text-progress')).toHaveText('0/5');
  await expect(page.getByTestId('checkbox-step-download')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('checkbox-step-download').click();
  await expect(other.getByTestId('text-progress')).toHaveText('1/5');
  await other.evaluate(() => localStorage.clear());
  await expect(page.getByTestId('text-progress')).toHaveText('0/5');
  await other.close();
});

test('progress refreshes after visiting a page without a checklist subscriber', async ({ page }) => {
  await ready(page, '/kits/spend-explorer');
  await page.getByTestId('checkbox-step-download').click();
  await page.getByTestId('link-back').click();
  await page.getByTestId('link-hero-getting-started').click();

  const other = await page.context().newPage();
  await ready(other, '/kits/spend-explorer');
  await other.getByTestId('checkbox-step-run').click();
  await page.getByTestId('link-all-kits').click();
  await expect(page.getByTestId('link-continue-spend-explorer')).toContainText('2/5');
  await other.close();
});

test('unreadable saved progress is reported and repaired on the next checklist change', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('launchpad.v1', '{'));
  await ready(page, '/kits/spend-explorer');
  await expect(page.getByTestId('storage-warning')).toContainText('could not be read');
  await page.getByTestId('checkbox-step-download').click();
  await expect(page.getByTestId('storage-warning')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('launchpad.v1')!));
  expect(stored.progress['spend-explorer']).toEqual(['download']);
});
