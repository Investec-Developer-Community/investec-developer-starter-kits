import { expect, test } from '@playwright/test';
import { ready } from './helpers';

const cases = [
  { route: '/kits/spend-explorer', button: 'button-download-script', filename: 'spend-explorer.mjs', error: 'File download failed' },
  { route: '/kits/spend-explorer', button: 'button-download-data', filename: 'spend-explorer-mock-data.json', error: 'File download failed' },
  { route: '/kits/spend-explorer', button: 'button-download-bundle', filename: 'spend-explorer-starter.zip', error: 'ZIP download failed' },
  { route: '/getting-started', button: 'button-download-script', filename: 'spend-explorer.mjs', error: 'File download failed' },
  { route: '/getting-started', button: 'button-download-data', filename: 'spend-explorer-mock-data.json', error: 'File download failed' },
  { route: '/getting-started', button: 'button-download-bundle', filename: 'spend-explorer-starter.zip', error: 'ZIP download failed' },
  { route: '/kits/card-to-sheet-sync', button: 'button-export-csv', filename: 'card-to-sheet-sync.csv', error: 'File download failed' },
];

for (const { route, button, filename, error } of cases) {
  test(`${route}: ${button} reports failure, cleans up and can be retried`, async ({ page }) => {
    await page.addInitScript(() => {
      const click = HTMLAnchorElement.prototype.click;
      const createObjectURL = URL.createObjectURL;
      const revokeObjectURL = URL.revokeObjectURL;
      let blocked = true;
      URL.createObjectURL = object => {
        const url = createObjectURL.call(URL, object);
        document.documentElement.dataset.createdDownloadUrl = url;
        return url;
      };
      URL.revokeObjectURL = url => {
        document.documentElement.dataset.revokedDownloadUrl = url;
        revokeObjectURL.call(URL, url);
      };
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        if (this.download && blocked) throw new DOMException('Download blocked', 'NotAllowedError');
        click.call(this);
      };
      window.addEventListener('test:allow-download', () => { blocked = false; });
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await ready(page, route);
    await page.getByTestId(button).click();
    await expect(page.getByText(error, { exact: true })).toBeVisible();
    await expect(page.getByText('Download started', { exact: true })).toHaveCount(0);
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const { createdDownloadUrl, revokedDownloadUrl } = document.documentElement.dataset;
      return !!createdDownloadUrl && createdDownloadUrl === revokedDownloadUrl;
    })).toBe(true);

    await page.evaluate(() => window.dispatchEvent(new Event('test:allow-download')));
    const download = page.waitForEvent('download');
    await page.getByTestId(button).click();
    expect((await download).suggestedFilename()).toBe(filename);
    await expect(page.getByText('Download started', { exact: true })).toBeVisible();
    await expect(page.getByText(error, { exact: true })).toHaveCount(0);
    await expect(page.locator('a[download]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
