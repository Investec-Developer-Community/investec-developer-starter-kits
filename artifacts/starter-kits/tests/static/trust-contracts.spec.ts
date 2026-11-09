import { test, expect } from "@playwright/test";
import { kits } from "../../src/data/kits";
import { PROJECT_STATUS_TEXT } from "../../src/data/project-status";

const repository =
  "https://github.com/Investec-Developer-Community/investec-developer-starter-kits";
const obsoleteTrustCopy =
  /\bprototype\b|\bmock(?:ed)?(?:[-\s]+data)?[-\s]+only\b|\bnot[-\s]+real\b|\bno[-\s]+real[-\s]+money\b/i;
const routes = [
  "",
  "getting-started",
  "reference",
  "saved",
  ...kits.map((kit) => `kits/${kit.slug}`),
];

test("the Investec wordmark is absent from built assets", async ({
  request,
  baseURL,
}) => {
  const logo = new URL("brand/investec-developer-logo.png", baseURL!);
  expect((await request.get(logo.href)).status(), logo.href).toBe(404);
});

for (const route of routes) {
  test(`trust links and branding: /${route}`, async ({ page, baseURL }) => {
    const url = new URL(route ? `${route}/` : "./", baseURL!);
    await page.goto(url.href);
    await expect(page.locator("main h1")).toBeVisible();

    const status = page.getByTestId("project-status");
    await expect(status).toHaveCount(1);
    await expect(status).toBeVisible();
    await expect(status).toHaveText(PROJECT_STATUS_TEXT);
    await expect(
      page.locator(
        'input[type="password"], input[autocomplete="current-password"], input[name*="token" i], input[name*="secret" i], input[name*="credential" i]',
      ),
    ).toHaveCount(0);

    const chromeText = `${await page.getByRole("banner").innerText()} ${await page
      .locator("footer")
      .innerText()}`;
    const metadataText = await page
      .locator("title, meta")
      .evaluateAll((elements) =>
        elements
          .map(
            (element) =>
              element.textContent ?? element.getAttribute("content") ?? "",
          )
          .join(" "),
      );
    expect(chromeText).not.toMatch(obsoleteTrustCopy);
    expect(metadataText).not.toMatch(obsoleteTrustCopy);

    await expect(
      page.locator('img[src*="/brand/investec" i], img[alt*="Investec" i]'),
    ).toHaveCount(0);

    const officialPortal = page.getByTestId("link-official-portal");
    await expect(officialPortal).toBeVisible();
    expect(
      await officialPortal.evaluate((anchor) => anchor.textContent?.trim()),
      "the official developer portal must be linked by text, not a logo",
    ).toBeTruthy();
    await expect(officialPortal.locator("img")).toHaveCount(0);
    await expect(officialPortal).toHaveAttribute("rel", /\bnoopener\b/);

    const requiredLinks = [
      page.locator(`a[href="${repository}"], a[href="${repository}/"]`),
      page.locator(`a[href="${repository}/blob/main/CONTRIBUTING.md"]`),
      page.locator(`a[href="${repository}/issues/new/choose"]`),
      page.locator(`a[href="${repository}/blob/main/LICENSE"]`),
    ];
    for (const link of requiredLinks) {
      await expect(link.first()).toBeVisible();
      expect(await link.first().innerText()).toBeTruthy();
      await expect(link.first()).toHaveAttribute("rel", /\bnoopener\b/);
    }

    const kit = kits.find(({ slug }) => route === `kits/${slug}`);
    if (kit) {
      const report = page.locator('a[href*="/issues/new?"]');
      await expect(report.first()).toBeVisible();
      const href = await report.first().getAttribute("href");
      const title = new URL(href!, page.url()).searchParams.get("title");
      expect(title, `report issue title for ${kit.slug}`).toContain(kit.slug);
    }
  });
}
