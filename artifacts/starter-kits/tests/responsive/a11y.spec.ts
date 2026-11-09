import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { kits } from "../../src/data/kits";
import { PROJECT_STATUS_TEXT } from "../../src/data/project-status";

const routes = [
  "/",
  "/getting-started",
  "/reference",
  "/saved",
  ...kits.map((kit) => `/kits/${kit.slug}`),
];
// The static host serves 404.html for these; the app must render an accessible not-found page.
const notFoundRoutes = ["/does-not-exist", "/kits/unknown-kit"];
const auditedRoutes = [...routes, ...notFoundRoutes];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const semanticRules = ["region", "heading-order", "landmark-one-main"];
const matrix = [
  { width: 320, reducedMotion: "reduce" as const },
  { width: 320, reducedMotion: "no-preference" as const },
  { width: 390, reducedMotion: "reduce" as const },
  { width: 390, reducedMotion: "no-preference" as const },
  { width: 1440, reducedMotion: "reduce" as const },
  { width: 1440, reducedMotion: "no-preference" as const },
];

function describeViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map(({ id, impact, description, nodes }) => ({
    id,
    impact,
    description,
    nodes: nodes.map(({ target, failureSummary }) => ({
      target,
      failureSummary,
    })),
  }));
}

for (const route of auditedRoutes) {
  test(`WCAG 2.2 AA: ${route}`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "The suite creates its own 320 px, 390 px and 1440 px contexts.",
    );

    for (const mode of matrix) {
      await page.setViewportSize({
        width: mode.width,
        height: mode.width === 1440 ? 900 : mode.width === 390 ? 844 : 800,
      });
      await page.emulateMedia({
        colorScheme: "light",
        reducedMotion: mode.reducedMotion,
      });
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      const status = page.getByRole("complementary", { name: "Project status" });
      await expect(status).toHaveCount(1);
      await expect(status).toHaveText(PROJECT_STATUS_TEXT);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1100);

      const wcag = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
      expect(
        describeViolations(wcag.violations),
        `${route} at ${mode.width}px, reducedMotion=${mode.reducedMotion}`,
      ).toEqual([]);

      const semantics = await new AxeBuilder({ page })
        .withRules(semanticRules)
        .analyze();
      expect(
        describeViolations(semantics.violations),
        `semantic rules on ${route} at ${mode.width}px, reducedMotion=${mode.reducedMotion}`,
      ).toEqual([]);
    }
  });
}

for (const route of auditedRoutes) {
  test(`landmarks, heading sequence and skip link: ${route}`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "The suite creates its own responsive contexts.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    const levels = await page
      .locator("h1,h2,h3,h4,h5,h6")
      .evaluateAll((headings) =>
        headings.map((heading) => Number(heading.tagName.slice(1))),
      );
    expect(levels[0], `first heading on ${route}`).toBe(1);
    for (let index = 1; index < levels.length; index += 1) {
      expect(
        levels[index]! - levels[index - 1]!,
        `heading sequence on ${route}: ${levels}`,
      ).toBeLessThanOrEqual(1);
    }

    const skipLink = page.locator('a[href="#main"]');
    await expect(skipLink).toHaveCount(1);
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator("#main")).toBeVisible();
  });
}

test("Spend Explorer controls have names and its results region is keyboard-focusable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "The suite creates its own responsive context.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/kits/spend-explorer");

  const category = page.getByLabel("Category");
  const search = page.getByRole("textbox", { name: "Search description" });
  const results = page.getByRole("region", { name: "Matching transactions" });
  await expect(category).toBeVisible();
  await expect(search).toBeVisible();
  await expect(results).toBeVisible();
  await category.focus();
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(results).toBeFocused();
});

test("kit-card labels stay readable and stop animating when reduced motion is requested", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "The suite creates its own responsive contexts.",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/");
    const cards = page.locator('[data-testid^="card-kit-"]');
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) {
      const motion = await card.evaluate((element) => ({
        animationName: getComputedStyle(element).animationName,
        opacity: getComputedStyle(element).opacity,
        labelOpacity: getComputedStyle(
          element.querySelector(":scope > div:first-child > span")!,
        ).opacity,
      }));
      expect(
        motion,
        `reduced-motion card ${await card.getAttribute("data-testid")}`,
      ).toEqual({
        animationName: "none",
        opacity: "1",
        labelOpacity: "1",
      });
    }
  }
});

test("kit-card category contrast never falls below 4.5:1 during the staggered entrance", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "The suite creates its own responsive contexts.",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.emulateMedia({
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    await page.addInitScript(() => {
      type Sample = {
        ratio: number;
        opacity: string;
        color: string;
        background: string;
        category: string;
      };
      const samples: Sample[] = [];
      Object.defineProperty(window, "__m5ContrastSamples", { value: samples });
      const parseColor = (value: string) => {
        const parts = value.match(/[\d.]+/g)?.map(Number);
        return parts?.length && parts.length >= 3
          ? parts.slice(0, 3)
          : [0, 0, 0];
      };
      const blend = (front: number[], back: number[], alpha: number) =>
        front.map(
          (channel, index) => channel * alpha + back[index]! * (1 - alpha),
        );
      const luminance = (color: number[]) => {
        const linear = color.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
      };
      const contrast = (foreground: number[], background: number[]) => {
        const [light, dark] = [
          luminance(foreground),
          luminance(background),
        ].sort((a, b) => b - a);
        return (light + 0.05) / (dark! + 0.05);
      };
      document.addEventListener("animationstart", (event) => {
        const card = event.target;
        if (
          !(card instanceof HTMLElement) ||
          !card.matches('[data-testid^="card-kit-"]')
        )
          return;
        if ((event as AnimationEvent).animationName !== "rise") return;
        const record = () => {
          const category = card.querySelector<HTMLElement>(
            ":scope > div:first-child > span",
          );
          if (!category) return;
          const cardStyle = getComputedStyle(card);
          const textStyle = getComputedStyle(category);
          let exterior = card.parentElement;
          while (
            exterior &&
            getComputedStyle(exterior).backgroundColor === "rgba(0, 0, 0, 0)"
          ) {
            exterior = exterior.parentElement;
          }
          const outside = parseColor(
            exterior
              ? getComputedStyle(exterior).backgroundColor
              : "rgb(255,255,255)",
          );
          const cardColor = parseColor(cardStyle.backgroundColor);
          const textColor = parseColor(textStyle.color);
          const opacity = Number(cardStyle.opacity);
          samples.push({
            ratio: contrast(
              blend(textColor, outside, opacity),
              blend(cardColor, outside, opacity),
            ),
            opacity: cardStyle.opacity,
            color: textStyle.color,
            background: cardStyle.backgroundColor,
            category: category.textContent?.trim() ?? "",
          });
        };
        const started = performance.now();
        const capture = () => {
          record();
          if (performance.now() - started < 450) requestAnimationFrame(capture);
        };
        requestAnimationFrame(capture);
      });
    });
    await page.goto("/");
    await expect(
      page.locator('[data-testid^="card-kit-"]').first(),
    ).toBeVisible();
    await page.waitForTimeout(1100);
    const samples = await page.evaluate(
      () =>
        (
          window as Window & {
            __m5ContrastSamples?: {
              ratio: number;
              opacity: string;
              color: string;
              background: string;
              category: string;
            }[];
          }
        ).__m5ContrastSamples ?? [],
    );
    expect(
      samples.length,
      `capture animation frames at ${width}px`,
    ).toBeGreaterThan(0);
    const minimum = samples.reduce((lowest, sample) =>
      sample.ratio < lowest.ratio ? sample : lowest,
    );
    expect(
      minimum,
      `lowest rendered category contrast at ${width}px; inspect opacity/color/background for M5`,
    ).toMatchObject({ ratio: expect.any(Number) });
    expect(
      minimum.ratio,
      `category contrast ${minimum.ratio.toFixed(2)}:1 at opacity ${minimum.opacity}, text ${minimum.color}, card ${minimum.background}`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
