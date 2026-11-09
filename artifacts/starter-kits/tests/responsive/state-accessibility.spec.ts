import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { noHorizontalOverflow, ready, tabTo, visibleFocus } from './helpers';

test('failure states remain accessible and contained', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    const click = HTMLAnchorElement.prototype.click;
    Storage.prototype.getItem = function (this: Storage, key) {
      if (key === 'launchpad.v1') throw new DOMException('Denied', 'SecurityError');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (this: Storage, key, value) {
      if (key === 'launchpad.v1') throw new DOMException('Denied', 'SecurityError');
      return setItem.call(this, key, value);
    };
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.download) throw new DOMException('Download blocked', 'NotAllowedError');
      click.call(this);
    };
  });
  await ready(page, '/kits/card-guard');
  await expect(page.getByTestId('storage-warning')).toBeVisible();
  await page.getByTestId('button-simulate').click();
  await page.getByTestId('input-limit').fill('invalid');
  await expect(page.getByTestId('status-decision-stale')).toBeVisible();
  await expect(page.getByTestId('input-limit')).toHaveAttribute('aria-invalid', 'true');
  await page.getByTestId('button-download-script').click();
  await expect(page.getByText('File download failed', { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(node => node.target),
  }))).toEqual([]);

  const close = page.getByRole('button', { name: 'Close notification' });
  await tabTo(page, close);
  await visibleFocus(close);
  await expect(close).toHaveCSS('opacity', '1');
  await page.keyboard.press('Enter');
  await expect(page.getByText('File download failed', { exact: true })).not.toBeVisible();
});

test('the overflow check still detects clipped visible text', async ({ page }) => {
  await ready(page, '/kits/card-guard');
  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.id = 'overflow-sentinel';
    Object.assign(probe.style, {
      position: 'fixed', left: `${innerWidth - 3}px`, top: '0',
      width: '2px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap',
    });
    probe.textContent = 'deliberate-visible-overflow';
    document.body.appendChild(probe);
  });
  await expect(noHorizontalOverflow(page)).rejects.toThrow('deliberate-visible-overflow');
  await page.evaluate(() => document.getElementById('overflow-sentinel')?.remove());
  await noHorizontalOverflow(page);
});
