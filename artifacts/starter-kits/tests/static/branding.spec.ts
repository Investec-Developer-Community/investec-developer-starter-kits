import { test, expect } from '@playwright/test';
import { PROJECT_STATUS_TEXT } from '../../src/data/project-status';
import { SITE_DESCRIPTION, SITE_IMAGE_ALT } from './site-meta';

test('header zebra, icons and text-only developer links on root and nested pages', async ({ page, request, baseURL }) => {
  for (const route of ['./', 'kits/who-paid', 'getting-started']) {
    await page.goto(route);
    await expect(page.getByRole('link', { name: 'Launchpad home', exact: true })).toBeVisible();
    await expect(page.getByTestId('project-status')).toHaveText(
      PROJECT_STATUS_TEXT,
    );
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      await expect(page.locator(selector)).toHaveAttribute(
        'content',
        SITE_DESCRIPTION,
      );
    }
    for (const selector of ['meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) {
      await expect(page.locator(selector)).toHaveAttribute(
        'content',
        SITE_IMAGE_ALT,
      );
    }
    await expect(page.locator('img[src*="investec" i], img[alt*="investec" i]')).toHaveCount(0);
    const developerPortal = page.getByTestId('link-official-portal');
    await expect(developerPortal).toHaveAttribute('href', /^https:\/\/developer\.investec\.com(?:\/|$)/);
    await expect(developerPortal).toBeVisible();
    expect((await developerPortal.innerText()).trim()).toBeTruthy();
    await expect(developerPortal.locator('img')).toHaveCount(0);
    for (const id of ['image-header-zebra']) {
      const mark = page.getByTestId(id);
      await expect(mark).toHaveAttribute('alt', '');
      await expect.poll(() => mark.evaluate(el => {
        const image = el as HTMLImageElement;
        return image.complete && image.naturalWidth === 96 && image.naturalHeight === 96;
      })).toBe(true);
      await expect(mark).toHaveAttribute('src', `${new URL(baseURL!).pathname}brand/launchpad-zebra.png`);
    }
    const icons = page.locator('link[rel="icon"],link[rel="apple-touch-icon"]');
    await expect(icons).toHaveCount(3);
    for (const icon of await icons.all()) {
      const href = await icon.getAttribute('href');
      const size = Number((await icon.getAttribute('sizes'))!.split('x')[0]);
      expect([16, 32, 180]).toContain(size);
      const url = new URL(href!, page.url()).href;
      expect(url.startsWith(baseURL!)).toBe(true);
      const response = await request.get(url);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      const png = await response.body();
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
  }
});
