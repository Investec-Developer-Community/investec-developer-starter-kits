import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const repoFile = path => new URL(`../../../../${path}`, import.meta.url);

async function readRepoFile(path) {
  return readFile(repoFile(path), 'utf8');
}

function requiredMatch(match, label) {
  assert.ok(match, `${label} must exist in the source HTML`);
  return match[1].trim();
}

function parseMetaTags(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => {
    const attributes = new Map(
      [...tag.matchAll(/([^\s=]+)\s*=\s*"([^"]*)"/g)].map(([, name, value]) => [name, value]),
    );
    return attributes;
  });
}

function metaValue(tags, key, value) {
  const tag = tags.find(attributes => attributes.get(key) === value);
  assert.ok(tag, `HTML must include meta ${key}="${value}"`);
  assert.ok(tag.has('content'), `meta ${key}="${value}" must have content`);
  return tag.get('content').trim();
}

test('README and architecture describe the mock-first sample-data showcase', async () => {
  const [readme, architecture] = await Promise.all([
    readRepoFile('README.md'),
    readRepoFile('docs/ARCHITECTURE.md'),
  ]);

  for (const [label, copy] of [['README', readme], ['architecture', architecture]]) {
    assert.match(copy, /mock-first/i, `${label} must identify the mock-first scope`);
    assert.match(copy, /showcase/i, `${label} must describe a showcase`);
    assert.match(copy, /sample data/i, `${label} must identify sample data`);
    assert.match(copy, /https:\/\/developer\.investec\.com\//, `${label} must link official next steps`);
  }
  assert.match(readme, /static website/i);
  assert.match(architecture, /fully static, credential-free/i);
});

test('contributor guidance requires documented fictional fixtures and offline local checks', async () => {
  const contributing = await readRepoFile('CONTRIBUTING.md');

  assert.match(contributing, /fictional fixtures shaped from documented API responses and card-code (?:inputs|mechanics)/i);
  assert.match(contributing, /https:\/\/developer\.investec\.com\//);
  assert.match(contributing, /label local derivations and unknown behavior/i);
  assert.match(contributing, /fixture\/local-fake tests offline/i);
  assert.match(contributing, /do not require credentials or sandbox\/production setup/i);
  assert.doesNotMatch(
    contributing,
    /\b(?:provide|enter|configure|obtain|set up|create)\s+(?:your\s+)?(?:banking\s+)?(?:credentials?|sandbox|production)\b/i,
    'contributor guidance must not prescribe credentials or live-environment setup',
  );
});

test('HTML metadata describes sample-data demos and preserves the official documentation next step', async () => {
  const html = await readRepoFile('artifacts/starter-kits/index.html');
  const tags = parseMetaTags(html);
  const title = requiredMatch(html.match(/<title>([\s\S]*?)<\/title>/i), 'title');
  const description = metaValue(tags, 'name', 'description');
  const ogTitle = metaValue(tags, 'property', 'og:title');
  const ogDescription = metaValue(tags, 'property', 'og:description');
  const twitterTitle = metaValue(tags, 'name', 'twitter:title');
  const twitterDescription = metaValue(tags, 'name', 'twitter:description');

  assert.match(title, /Launchpad.*Programmable Banking Starter Kits/);
  assert.equal(ogTitle, title);
  assert.equal(twitterTitle, title);
  assert.equal(ogDescription, description);
  assert.equal(twitterDescription, description);
  for (const [label, copy] of [
    ['description', description],
    ['Open Graph description', ogDescription],
    ['Twitter description', twitterDescription],
  ]) {
    assert.match(copy, /showcase/i, `${label} must describe the showcase`);
    assert.match(copy, /sample data/i, `${label} must describe sample-data demos`);
    assert.match(copy, /official documentation.*next steps/i, `${label} must direct developers to official documentation`);
  }
});

test('social preview metadata points to the committed image with consistent descriptive alt text', async () => {
  const [html, pagesGuide] = await Promise.all([
    readRepoFile('artifacts/starter-kits/index.html'),
    readRepoFile('artifacts/starter-kits/GITHUB_PAGES.md'),
  ]);
  const tags = parseMetaTags(html);
  const ogImage = metaValue(tags, 'property', 'og:image');
  const twitterImage = metaValue(tags, 'name', 'twitter:image');
  const ogAlt = metaValue(tags, 'property', 'og:image:alt');
  const twitterAlt = metaValue(tags, 'name', 'twitter:image:alt');

  assert.equal(ogImage, twitterImage);
  assert.equal(ogImage, '__LAUNCHPAD_SOCIAL_IMAGE__');
  assert.equal(ogAlt, twitterAlt);
  assert.match(ogAlt, /sample-data API and card-code demos/i);
  assert.equal(metaValue(tags, 'property', 'og:image:type'), 'image/png');
  assert.equal(metaValue(tags, 'property', 'og:image:width'), '1200');
  assert.equal(metaValue(tags, 'property', 'og:image:height'), '630');
  assert.equal(metaValue(tags, 'name', 'twitter:card'), 'summary_large_image');
  assert.match(pagesGuide, /public\/brand\/launchpad-social\.png/);
  assert.match(pagesGuide, /Open Graph and\s+Twitter metadata/);

  const image = await stat(repoFile('artifacts/starter-kits/public/brand/launchpad-social.png'));
  assert.ok(image.isFile() && image.size > 0, 'committed social preview image must be present');
});

test('brand copy keeps mock-first status and no-endorsement provenance without obsolete switch wording', async () => {
  const brand = await readRepoFile('artifacts/starter-kits/BRAND_ASSETS.md');
  const currentStatus = brand.split('## Project identity and current status copy', 2)[1];
  assert.ok(currentStatus, 'current project-status copy section must exist');

  assert.match(currentStatus, /mock-first showcase/i);
  assert.match(currentStatus, /fictional sample data shaped by documented API and card-code mechanics/i);
  assert.match(currentStatus, /official Investec Developer documentation/i);
  assert.match(currentStatus, /does not provide sandbox or production integrations/i);
  assert.doesNotMatch(
    currentStatus,
    /\b(?:switch(?:ing)?|move|migrate|graduate)\b.{0,50}\b(?:sandbox|production)\b|\b(?:sandbox|production)\b.{0,50}\b(?:switch|mode|integration setup)\b/i,
    'current brand copy must not describe a sandbox/production switch',
  );
  assert.match(brand, /Do not imply Investec endorsement/i);
  assert.match(brand, /no-endorsement\s+disclaimer/i);
});

const credentialSetupCopy =
  /\b(?:sandbox|production|live)\s+(?:api\s+)?(?:credentials?|keys?)\b|\byour\s+own\s+(?:api\s+)?(?:keys?|credentials?)\b|\b(?:to|in)\s+production\s+with\b|\bswitch(?:es|ing)?\s+to\s+(?:the\s+)?(?:investec\s+)?(?:sandbox|production|live)\b|\blive\s+mode\b/i;

async function publicCopySources() {
  const sources = ['artifacts/starter-kits/index.html'];
  for (const dir of ['components', 'pages', 'data', 'lib']) {
    const files = await readdir(repoFile(`artifacts/starter-kits/src/${dir}`), { recursive: true });
    for (const file of files) {
      if (/\.(?:tsx?|mjs)$/.test(file) && !/\.test\./.test(file)) sources.push(`artifacts/starter-kits/src/${dir}/${file}`);
    }
  }
  return sources;
}

test('public copy never invites sandbox, production or own-key credential setup', async () => {
  const sources = await publicCopySources();
  assert.ok(sources.includes('artifacts/starter-kits/src/components/project-status.tsx'), 'project status component must be scanned');
  for (const path of sources) {
    const source = await readRepoFile(path);
    const match = source.match(credentialSetupCopy);
    assert.equal(match, null, `${path} contains credential-setup copy: "${match?.[0]}"`);
  }
});

test('project status renders the guardrails-approved wording from one constant', async () => {
  const [guardrails, constantSource, component] = await Promise.all([
    readRepoFile('docs/decisions/product-guardrails.md'),
    readRepoFile('artifacts/starter-kits/src/data/project-status.ts'),
    readRepoFile('artifacts/starter-kits/src/components/project-status.tsx'),
  ]);
  const approved = guardrails.match(/^- Status: \*\*(.+)\*\*$/m)?.[1];
  assert.ok(approved, 'guardrails must define the approved status wording');
  const constant = constantSource.match(/export const PROJECT_STATUS_TEXT =\s*'([^']+)';/)?.[1];
  assert.equal(constant, approved, 'PROJECT_STATUS_TEXT must match the guardrails wording verbatim');
  assert.match(component, /\{PROJECT_STATUS_TEXT\}/, 'ProjectStatus must render the shared constant');
  assert.doesNotMatch(component.replace(/import[^\n]*\n/g, ''), /\b(?:sandbox|production|keys?)\b/i, 'ProjectStatus must not carry its own copy');
});
