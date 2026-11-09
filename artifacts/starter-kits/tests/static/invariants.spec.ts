// Architectural invariants for the built, statically hosted Launchpad.
// Every test runs against both the root and repository-path builds.
import { test, expect, type Page } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { kits } from '../../src/data/kits';
import { operateDemo } from '../responsive/helpers';

const buildRoot = fileURLToPath(new URL('../../../../generated-artifacts/static-hosting/', import.meta.url));
const routes = ['', 'getting-started', 'reference', 'saved', ...kits.map(kit => `kits/${kit.slug}`)];
const notFoundRoutes = ['does-not-exist', 'unknown/nested/path', 'kits/', 'kits/unknown-kit', 'kits/spend-explorer/extra', 'getting-started/extra', 'reference/nope/deeper'];
const staticResourceTypes = ['document', 'script', 'stylesheet', 'image', 'font', 'media', 'manifest', 'texttrack'];
const runtimeCallTypes = ['fetch', 'xhr', 'eventsource', 'websocket', 'ping', 'other'];

type Traffic = { url: string; type: string; reason: string }[];

// Aborts and records anything that is not a same-origin static asset.
async function guardNetwork(page: Page, baseURL: string): Promise<Traffic> {
  const origin = new URL(baseURL).origin;
  const violations: Traffic = [];
  await page.context().route('**/*', route => {
    const request = route.request();
    const url = request.url();
    const type = request.resourceType();
    if (new URL(url).origin !== origin) {
      violations.push({ url, type, reason: 'non-origin host' });
      return route.abort('blockedbyclient');
    }
    if (runtimeCallTypes.includes(type) || !staticResourceTypes.includes(type)) {
      violations.push({ url, type, reason: 'runtime call to same origin' });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  page.on('websocket', socket => violations.push({ url: socket.url(), type: 'websocket', reason: 'websocket' }));
  return violations;
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });
  return errors;
}

async function settle(page: Page) {
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(requestAnimationFrame);
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}

const credentialPattern = /pass(?:word|phrase|code)|secret|api[\s_-]?key|client[\s_-]?id|token|credential|bearer|oauth|one[\s_-]?time|\botp\b|\bpin\b|\bcvv\b|\bcvc\b|card[\s_-]?number|\bpan\b/i;
const credentialAutocomplete = ['current-password', 'new-password', 'one-time-code', 'cc-number', 'cc-csc', 'cc-exp', 'username'];

async function credentialFields(page: Page) {
  return page.locator('input, textarea, select, [contenteditable]:not([contenteditable="false"])').evaluateAll(
    (fields, [source, autocompletes]) => {
      const pattern = new RegExp(source as string, 'i');
      return fields.flatMap(field => {
        const element = field as HTMLInputElement;
        const labelledBy = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/)
          .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        const described = [
          element.getAttribute('name'), element.id, element.getAttribute('placeholder'),
          element.getAttribute('aria-label'), labelledBy, element.getAttribute('data-testid'),
          ...Array.from(element.labels ?? [], label => label.textContent),
        ].filter(Boolean).join(' | ');
        const autocomplete = (element.getAttribute('autocomplete') ?? '').toLowerCase();
        const bad = element.type === 'password' || pattern.test(described) ||
          (autocompletes as string[]).some(token => autocomplete.split(/\s+/).includes(token));
        return bad ? [`<${element.tagName.toLowerCase()} type=${element.type}> ${described} autocomplete=${autocomplete}`] : [];
      });
    },
    [credentialPattern.source, credentialAutocomplete] as const,
  );
}

// Invariants 1 and 2: no credential fields, and no runtime traffic beyond same-origin static assets,
// including after every button in the in-browser demo has been operated.
for (const route of routes) {
  test(`no credential inputs and no off-origin or runtime requests: /${route}`, async ({ page, baseURL }) => {
    const traffic = await guardNetwork(page, baseURL!);
    const errors = trackErrors(page);
    expect((await page.goto(route || './'))?.status()).toBe(200);
    await settle(page);
    expect(await credentialFields(page), `credential-like fields on /${route}`).toEqual([]);

    if (await page.locator('section#try').count()) {
      expect(await operateDemo(page), `/${route} demo exposes operable controls`).toBeGreaterThan(0);
      await page.waitForLoadState('networkidle');
      expect(await credentialFields(page), `credential-like fields after operating the /${route} demo`).toEqual([]);
    }
    expect(traffic, `network traffic on /${route}`).toEqual([]);
    expect(errors, `runtime errors on /${route}`).toEqual([]);
  });
}

test('credential field detector flags representative violations', async ({ page }) => {
  await page.setContent(`
    <label>Client ID <input></label>
    <input type="password">
    <input placeholder="x-api-key">
    <input aria-label="Client secret">
    <input autocomplete="one-time-code">
    <label>Merchant <input name="merchant"></label>`);
  expect(await credentialFields(page)).toHaveLength(5);
});

// Invariants 4-7 gaps: unknown routes at every depth return HTTP 404 and render a not-found page.
for (const route of notFoundRoutes) {
  test(`unknown route is a 404, not a blank page or another route: /${route}`, async ({ page, baseURL }) => {
    const traffic = await guardNetwork(page, baseURL!);
    const errors = trackErrors(page);
    expect((await page.goto(route))?.status()).toBe(404);
    const notFound = route.startsWith('kits/unknown-kit')
      ? page.getByTestId('kit-not-found')
      : page.getByRole('heading', { level: 1, name: 'This page could not be found.' });
    await expect(notFound).toBeVisible();
    await expect(page.getByTestId('text-kit-name')).toHaveCount(0);
    expect(traffic).toEqual([]);
    expect(errors.filter(error => !/status of 404/.test(error))).toEqual([]);
  });
}

test('deep links keep query strings and hashes', async ({ page, baseURL }) => {
  const traffic = await guardNetwork(page, baseURL!);
  expect((await page.goto('kits/swipe-n-save?ref=static-test#try'))?.status()).toBe(200);
  await expect(page.getByTestId('text-kit-name')).toHaveText(kits.find(k => k.slug === 'swipe-n-save')!.name);
  await expect(page.locator('#h-try')).toBeInViewport();
  expect(new URL(page.url()).search).toBe('?ref=static-test');
  expect(traffic).toEqual([]);
});

// Invariant 8: every download is produced in the browser from a blob, with no network request.
test('every download is a client-side blob with no network request', async ({ page, baseURL }) => {
  const traffic = await guardNetwork(page, baseURL!);
  const during: string[] = [];
  page.on('request', request => during.push(`${request.resourceType()} ${request.url()}`));

  async function expectLocalDownload(trigger: () => Promise<void>, filename: string) {
    during.length = 0;
    const pending = page.waitForEvent('download');
    await trigger();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(filename);
    expect(download.url(), `${filename} download URL`).toMatch(/^(?:blob|data):/);
    expect(await download.failure()).toBeNull();
    expect(during, `requests while downloading ${filename}`).toEqual([]);
  }

  for (const kit of kits) {
    await page.goto(`kits/${kit.slug}`);
    await expect(page.getByTestId('text-kit-name')).toHaveText(kit.name);
    await page.waitForLoadState('networkidle');
    await expectLocalDownload(() => page.getByTestId('button-download-bundle').click(), `${kit.slug}-starter.zip`);
    await expectLocalDownload(() => page.getByTestId('button-download-script').click(), kit.scriptFile);
    await expectLocalDownload(() => page.getByTestId('button-download-data').click(), kit.dataFile);
  }
  await page.goto('kits/card-to-sheet-sync#try');
  await page.waitForLoadState('networkidle');
  await expectLocalDownload(() => page.getByTestId('button-export-csv').click(), 'card-to-sheet-sync.csv');
  await page.goto('getting-started');
  await page.waitForLoadState('networkidle');
  for (const button of ['button-download-bundle', 'button-download-script', 'button-download-data']) {
    during.length = 0;
    const pending = page.waitForEvent('download');
    await page.getByTestId(button).click();
    const download = await pending;
    expect(download.url()).toMatch(/^(?:blob|data):/);
    expect(during, `requests while downloading from getting-started ${button}`).toEqual([]);
  }
  expect(traffic).toEqual([]);
});

// Invariant 9: corrupted or unavailable localStorage cannot break any page.
const storageKey = 'launchpad.v1';
const corruptValues: Record<string, string> = {
  'truncated JSON': '{',
  'non-JSON text': 'not json at all',
  'literal undefined': 'undefined',
  'NaN': 'NaN',
  'empty string': '',
  'JSON string': '"progress"',
  'JSON number': '42',
  'JSON boolean': 'true',
  'JSON null': 'null',
  'JSON array': '[1,2,3]',
  'empty object': '{}',
  'progress null': '{"progress":null}',
  'progress string': '{"progress":"download"}',
  'progress array': '{"progress":["download"]}',
  'progress number': '{"progress":42}',
  'kit progress string': '{"progress":{"spend-explorer":"download","card-guard":7}}',
  'kit progress object': '{"progress":{"spend-explorer":{"0":"download"},"who-paid":null}}',
  'mixed id types': '{"progress":{"spend-explorer":[null,1,{},["download"],true,"download"]}}',
  'prototype keys': '{"progress":{"__proto__":["download"],"constructor":["download"],"toString":["x"],"hasOwnProperty":[]}}',
};

for (const [label, value] of [...Object.entries(corruptValues), ['storage access throws', null] as const]) {
  test(`localStorage ${label} cannot break the app`, async ({ page, baseURL }) => {
    const traffic = await guardNetwork(page, baseURL!);
    const errors = trackErrors(page);
    await page.addInitScript(([key, raw]) => {
      if (raw === null) {
        Storage.prototype.getItem = () => { throw new DOMException('denied', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('denied', 'SecurityError'); };
      } else {
        localStorage.setItem(key, raw);
      }
    }, [storageKey, value] as const);
    for (const route of ['', 'getting-started', 'reference', 'saved', ...kits.map(kit => `kits/${kit.slug}`)]) {
      await page.goto(route || './');
      await expect(page.locator('main h1'), `/${route} renders`).toBeVisible();
      await expect(page.getByText('Something went wrong'), `/${route} error boundary`).toHaveCount(0);
      const kit = kits.find(k => route === `kits/${k.slug}`);
      if (kit) await expect(page.getByTestId('text-kit-name')).toHaveText(kit.name);
    }
    const kit = kits.find(k => k.slug === 'spend-explorer')!;
    await page.goto(`kits/${kit.slug}`);
    const step = page.getByTestId(`checkbox-step-${kit.checklist[0]!.id}`);
    const before = await page.getByTestId('text-progress').textContent();
    await step.click();
    await expect(page.getByTestId('text-progress')).not.toHaveText(before!);
    await expect(page.getByTestId('text-progress')).toHaveText(new RegExp(`^\\d+/${kit.checklist.length}$`));
    expect(traffic).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// Invariants 2 and 3: the shipped bundle has no runtime network clients, banking API hosts,
// CDN dependencies or workspace backend packages.
async function builtFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter(entry => entry.isFile() && /\.(?:js|mjs|css|html)$/.test(entry.name))
    .map(entry => path.join(entry.parentPath, entry.name));
}

function scanBundle(name: string, source: string): string[] {
  const findings: string[] = [];
  const report = (rule: string, index: number) => findings.push(`${name}: ${rule}: …${source.slice(Math.max(0, index - 60), index + 80)}…`);
  const forbidden: [string, RegExp][] = [
    ['XMLHttpRequest', /\bXMLHttpRequest\b/g],
    ['EventSource', /\bEventSource\b/g],
    ['WebSocket', /\bWebSocket\b/g],
    ['sendBeacon', /\bsendBeacon\b/g],
    ['service worker', /serviceWorker\s*\.\s*register|\bimportScripts\s*\(/g],
    ['Investec API host', /\b(?:openapi|api|secure|sandbox|oauth)[\w.-]*\.investec\.(?:com|co\.za)\b/gi],
    ['OAuth token endpoint', /\/identity\/v2\/oauth2\/token/gi],
    ['workspace backend package', /@workspace\/(?:api|db)/g],
    ['absolute-URL fetch', /(?<![\w$.])fetch\s*\(\s*(?:["'`](?:https?:)?\/\/|new\s+URL\s*\(\s*["'`]https?:)/g],
  ];
  for (const [rule, pattern] of forbidden) for (const match of source.matchAll(pattern)) report(rule, match.index);
  // The only global fetch call allowed is Vite's same-origin modulepreload polyfill.
  // Method definitions such as `async fetch(e,t){` are not calls.
  for (const match of source.matchAll(/(?<![\w$.#])fetch\s*\(/g)) {
    const after = source.slice(match.index + match[0].length, match.index + match[0].length + 200);
    const before = source.slice(Math.max(0, match.index - 8), match.index);
    if (/\basync\s+$/.test(before) || /^[^()]*\)\s*\{/.test(after)) continue;
    if (!/modulepreload/.test(source.slice(Math.max(0, match.index - 800), match.index))) report('global fetch outside the modulepreload polyfill', match.index);
  }
  if (name.endsWith('.html')) {
    for (const match of source.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["'][^>]*>/gi)) {
      if (!/rel\s*=\s*["'](?:canonical|me|author|license)["']/i.test(match[0])) report(`external script or stylesheet ${match[1]}`, match.index);
    }
  }
  return findings;
}

test('built bundle has no runtime network clients, banking API hosts or backend packages', async ({}, testInfo) => {
  const dir = path.join(buildRoot, testInfo.project.name);
  const files = await builtFiles(dir);
  expect(files.filter(file => file.endsWith('.js')).length, `JavaScript chunks in ${dir}`).toBeGreaterThan(0);
  expect(files.some(file => file.endsWith(`${path.sep}404.html`)), '404.html is emitted').toBe(true);
  const findings: string[] = [];
  for (const file of files) findings.push(...scanBundle(path.relative(dir, file), await readFile(file, 'utf8')));
  expect(findings).toEqual([]);
});

test('bundle scanner flags representative violations', () => {
  const seeded = [
    'fetch("https://openapi.investec.com/za/pb/v1/accounts")',
    'x=new XMLHttpRequest',
    'new EventSource("/stream")',
    'new WebSocket("wss://example.com")',
    'navigator.sendBeacon("/x")',
    'import "@workspace/api-client-react"',
    'fetch(`//cdn.example.com/x`)',
    'fetch(apiUrl)',
  ];
  for (const sample of seeded) expect(scanBundle('seeded.js', sample), sample).not.toEqual([]);
  expect(scanBundle('ok.js', 'modulepreload;function n(e){fetch(e.href,t)} q.fetch(1) a.refetch() class Q{async fetch(e,t){return 1}}')).toEqual([]);
  expect(scanBundle('late.js', `${'x'.repeat(900)};fetch(url,{method:"POST"})`)).not.toEqual([]);
  expect(scanBundle('nested.js', `${'x'.repeat(900)};fetch(u(x)).then(r=>r.json())`)).not.toEqual([]);
  expect(scanBundle('index.html', '<script type="module" src="https://cdn.example.com/app.js"></script>')).not.toEqual([]);
  expect(scanBundle('index.html', '<link rel="canonical" href="https://example.com/">')).toEqual([]);
});
