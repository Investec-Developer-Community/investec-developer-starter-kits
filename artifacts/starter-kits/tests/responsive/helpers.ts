import { expect, type Locator, type Page } from '@playwright/test';

export async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image =>
      image.complete ? Promise.resolve() : new Promise(resolve => {
        image.onload = resolve;
        image.onerror = resolve;
      }),
    ));
  });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
}

export async function noHorizontalOverflow(page: Page) {
  const violations = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const failures: string[] = [];
    if (document.documentElement.scrollWidth > width + 1) failures.push('document scroll width');
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (!el.getClientRects().length || ['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(el.tagName.toUpperCase())) continue;
      // Intentional, bounded code/table scrollers may have wide descendants.
      // Do not exempt overflow:hidden/clip: those can conceal real regressions.
      let parent = el.parentElement;
      let inScroller = false;
      while (parent && parent !== document.body) {
        if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX) &&
            parent.scrollWidth > parent.clientWidth) { inScroller = true; break; }
        parent = parent.parentElement;
      }
      const rect = el.getBoundingClientRect();
      if (!inScroller && (rect.left < -1 || rect.right > width + 1)) {
        failures.push(`${el.tagName} ${el.dataset.testid || el.textContent?.trim().slice(0, 65)} (${Math.round(rect.left)}..${Math.round(rect.right)})`);
      }
      if (!inScroller && !['auto', 'scroll'].includes(getComputedStyle(el).overflowX)) {
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          if (Array.from(range.getClientRects()).some(r => r.left < -1 || r.right > width + 1)) {
            failures.push(`Text outside viewport: ${node.textContent.trim().slice(0, 80)}`);
          }
        }
      }
    }
    return failures;
  });
  expect(violations, 'No content may escape the viewport, even with overflow-x:clip').toEqual([]);
}

export async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(el => el === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${target} using Tab`);
}

export async function visibleFocus(target: Locator) {
  await expect(target).toBeFocused();
  expect(await target.evaluate(el => {
    const style = getComputedStyle(el);
    const outlined = parseFloat(style.outlineWidth) >= 2 &&
      !['none', 'hidden'].includes(style.outlineStyle) &&
      !['transparent', 'rgba(0, 0, 0, 0)'].includes(style.outlineColor);
    const ring = style.boxShadow !== 'none' && !style.boxShadow.includes('rgba(0, 0, 0, 0) 0px 0px 0px 0px');
    return el.matches(':focus-visible') && (outlined || ring);
  }), 'Keyboard focus must have a visible outline or ring').toBe(true);
}
