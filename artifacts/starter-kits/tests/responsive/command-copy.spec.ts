import { test, expect } from '@playwright/test';

for (const path of ['/kits/spend-explorer', '/getting-started']) {
  for (const outcome of ['success', 'rejected', 'unavailable'] as const) {
    test(`${path}: clipboard ${outcome} with keyboard and bounded scrolling`, async ({ page }) => {
      await page.addInitScript((mode) => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: mode === 'unavailable' ? undefined : {
            writeText: async (text: string) => {
              if (mode === 'rejected') throw new DOMException('Blocked', 'NotAllowedError');
              document.documentElement.dataset.copiedCommand = text;
            },
          },
        });
      }, outcome);
      await page.goto(path);
      const block = page.getByTestId('command-block').first();
      const command = (await block.locator('code').innerText()).replace(/^\$ /, '');
      const button = block.getByRole('button', { name: 'Copy command' });
      await block.locator('pre').focus();
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
      await page.keyboard.press('Enter');
      const status = block.getByRole('status');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      if (outcome === 'success') {
        await expect(status).toHaveText('Command copied.');
        await expect(page.locator('html')).toHaveAttribute('data-copied-command', command);
        await expect(block.getByRole('textbox')).toHaveCount(0);
      } else {
        await expect(status).toContainText('Could not copy automatically.');
        const manual = block.getByRole('textbox', { name: 'Command for manual copy' });
        await expect(manual).toHaveValue(command);
        await page.keyboard.press('Tab');
        await expect(manual).toBeFocused();
        expect(await manual.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(command.length);
        // A denied attempt must not prevent a later retry.
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
          configurable: true, value: { writeText: async () => {} },
        }));
        await button.focus();
        await page.keyboard.press('Space');
        await expect(status).toHaveText('Command copied.');
        await expect(manual).toHaveCount(0);
      }
      for (const pre of await page.getByTestId('command-block').locator('pre').all()) {
        expect(await pre.evaluate(el => {
          const bounds = el.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth &&
            getComputedStyle(el).overflowX === 'auto' && el.tabIndex === 0;
        })).toBe(true);
      }
    });
  }
}
