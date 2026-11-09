import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveObjectURL } from 'node:buffer';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { kits } from '../data/kits.ts';
import { createStarterZip, downloadStarterBundle, starterFiles } from '../lib/starter-bundle.ts';

test('starter downloads use stable slug filenames and contain the exact generated ZIP', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const clicked: { filename: string; url: string }[] = [];
  let removed = false;
  const fakeDocument = {
    body: { appendChild() {} },
    createElement(tag: string) {
      assert.equal(tag, 'a');
      return {
        href: '',
        download: '',
        click() { clicked.push({ filename: this.download, url: this.href }); },
        remove() { removed = true; },
      };
    },
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
  try {
    for (const kit of kits) {
      clicked.length = 0;
      removed = false;
      await downloadStarterBundle(kit);
      assert.equal(clicked.length, 1, `${kit.slug} starts a download`);
      assert.equal(clicked[0].filename, `${kit.slug}-starter.zip`);
      assert.equal(removed, true, `${kit.slug} removes its temporary link`);
      const blob = resolveObjectURL(clicked[0].url);
      assert.ok(blob, `${kit.slug} creates a Blob URL`);
      assert.equal(blob.type, 'application/zip');
      assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), createStarterZip(kit));
    }
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

function zipFiles(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  let offset = 0;
  while (offset + 30 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const size = view.getUint32(offset + 18, true);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(zip.subarray(nameStart, contentStart - extraLength));
    files.set(name, decoder.decode(zip.subarray(contentStart, contentStart + size)));
    offset = contentStart + size;
  }
  return files;
}

function verifiedZipFiles(zip: Uint8Array) {
  const script = [
    'import io, json, sys, zipfile',
    'with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as archive:',
    '    names = archive.namelist()',
    '    if len(names) != len(set(names)): raise ValueError("duplicate ZIP entries")',
    '    if archive.testzip() is not None: raise ValueError("invalid ZIP CRC")',
    '    print(json.dumps({name: archive.read(name).decode("utf-8") for name in names}))',
  ].join('\n');
  const contents = execFileSync('python3', ['-c', script], {
    input: zip, encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  return new Map<string, string>(Object.entries(JSON.parse(contents)));
}

const internalReferences: [string, RegExp][] = [
  ['PRD', /\bPRD(?:\.md)?\b/i],
  ['plan document', /\b[\w.-]+_PLAN\.md\b/i],
  ['verification document', /\bdocs[\\/]+verification(?:[\\/]|(?=$|[^\w-]))/i],
  ['squad state', /(?:^|[^a-z0-9_-])\.squad(?:[\\/]|(?=$|[^a-z0-9_-]))/i],
  ['agent memory', /(?:^|[^a-z0-9_-])\.agents(?:[\\/]|(?=$|[^a-z0-9_-]))/i],
  ['agent configuration', /(?:^|[^a-z0-9_-])\.github[\\/]+(?:agents|skills|copilot-instructions\.md)(?:[\\/]|(?=$|[^a-z0-9_-]))/i],
  ['agent instructions', /\bAGENTS\.md\b/i],
];

function findInternalReferences(value: string, location: string, findings: string[]) {
  for (const [kind, pattern] of internalReferences) {
    if (pattern.test(value)) findings.push(`${location}: ${kind}`);
  }
}

function inspectPublicData(value: unknown, location: string, findings: string[]): void {
  if (typeof value === 'string') {
    findInternalReferences(value, location, findings);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => inspectPublicData(item, `${location}[${index}]`, findings));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      findInternalReferences(key, `${location}.${key} field name`, findings);
      inspectPublicData(item, `${location}.${key}`, findings);
    }
  }
}

test('public kit data excludes internal planning, verification and team references', () => {
  assert.ok(kits.length > 0, 'the production kit catalogue must not be empty');
  const findings: string[] = [];
  for (const kit of kits) inspectPublicData(kit, kit.slug, findings);
  assert.deepEqual(findings, [], 'public kit data must not expose internal documents');
});

test('downloaded ZIP entries exclude internal planning, verification and team references', () => {
  assert.ok(kits.length > 0, 'the production kit catalogue must not be empty');
  const findings: string[] = [];
  for (const kit of kits) {
    const files = verifiedZipFiles(createStarterZip(kit));
    const expectedFiles = starterFiles(kit);
    assert.ok(files.has(`${kit.slug}/README.md`), `${kit.slug} ZIP must contain its README`);
    if (kit.slug === 'card-guard') {
      assert.ok(files.has('card-guard/card-code/README.md'), 'Card Guard ZIP must contain its nested README');
    }
    assert.deepEqual(
      [...files.keys()].sort(),
      Object.keys(expectedFiles).map(name => `${kit.slug}/${name}`).sort(),
      `${kit.slug} ZIP must expose every generated file`,
    );
    for (const [name, content] of files) {
      assert.ok(content === expectedFiles[name.slice(kit.slug.length + 1)], `${name} must extract byte-for-byte`);
      findInternalReferences(name, `${name} ZIP filename`, findings);
      findInternalReferences(content, `${name} ZIP content`, findings);
    }
  }
  assert.deepEqual(findings, [], 'downloaded ZIP entries must not expose internal documents');
});

test('both Card Guard README files retain public sources and offline model limitations', () => {
  const kit = kits.find(candidate => candidate.slug === 'card-guard');
  assert.ok(kit, 'Card Guard must be in the production kit catalogue');
  const files = verifiedZipFiles(createStarterZip(kit));
  const wikiUrl = 'https://github.com/Investec-Developer-Community/community-wiki/blob/ef8301c86771bd067792f7a94bd0f4bf1cbdc47a/get-started/card-quick-start-guide/how-to-add-code-to-your-card.md';
  const cardReferenceUrl = 'https://developer.investec.com/api-reference/SA%20Card%20Code';
  const baselineUrl = 'https://github.com/Investec-Developer-Community/investec-developer-starter-kits/blob/main/scripts/official-api-baseline.json';
  const expectations: [RegExp, string][] = [
    [/node simulate-card-code\.mjs/, 'must document the local simulator command'],
    [/not an Investec IDE replica/, 'must distinguish the local teaching model'],
    [/returns `true` to approve or `false` to decline/, 'must explain the documented boolean outcomes'],
    [/Not documented, so not simulated:/, 'must label the undocumented behavior'],
    [/`afterDecline` argument fields/, 'must acknowledge unknown decline argument fields'],
    [/whether `afterTransaction` also runs after a decline/, 'must acknowledge the unknown decline hook behavior'],
  ];

  for (const name of ['card-guard/README.md', 'card-guard/card-code/README.md']) {
    const readme = files.get(name);
    assert.ok(readme, `${name} must be included in the downloaded ZIP`);
    assert.ok(readme.includes(`](${cardReferenceUrl})`), `${name} must link to the public Card API reference`);
    assert.ok(readme.includes(`](${baselineUrl})`), `${name} must link to the published API baseline`);
    assert.ok(readme.includes(`](${wikiUrl})`), `${name} must link to the cited community wiki`);
    assert.doesNotMatch(readme, /matches the live/i, `${name} must not claim unverified live alignment`);
    for (const [pattern, description] of expectations) {
      assert.ok(pattern.test(readme), `${name} ${description}`);
    }
  }
});

test('starter ZIPs have one slug root and setup steps match extraction', () => {
  for (const kit of kits) {
    const files = zipFiles(createStarterZip(kit));
    assert.ok(files.size > 0, `${kit.slug} has ZIP entries`);
    assert.ok([...files.keys()].every(name => name.startsWith(`${kit.slug}/`)), `${kit.slug} entries use its root`);
    assert.ok(!kit.setup.some(step => step.body.toLowerCase().includes('mkdir')), `${kit.slug} setup has no mkdir instruction`);
    assert.ok(kit.setup.some(step =>
      step.title === 'Extract the starter' &&
      step.body.includes(`Download the ZIP, extract it, then cd ${kit.slug}.`),
    ), `${kit.slug} explains extraction and its folder`);
    const readme = starterFiles(kit)['README.md'] ?? '';
    assert.match(readme, new RegExp(`cd ${kit.slug}`));
    assert.match(readme, /## Illustrative API notes/);
    assert.match(readme, /## Official next steps/);
    assert.match(readme, /do not connect to a bank/);
    assert.doesNotMatch(readme, /curl|client_id|client_secret|x-api-key|\.env|production switch|token setup/i);
    if (kit.usesInvestecApi) {
      assert.match(readme, /data\.transactions/);
      assert.match(readme, /fromDate, toDate, transactionType and includePending/);
      assert.match(readme, /Who Paid\?/);
    } else {
      assert.match(readme, /simulationcode, string centsAmount/);
      assert.match(readme, /not the runtime hook argument/);
    }
  }
});

test('every generated archive validates and extracts the exact files under its documented slug', async () => {
  const parent = resolve(process.cwd(), '.test-work');
  await mkdir(parent, { recursive: true });
  const root = join(parent, `starter-bundles-${process.pid}-${Date.now()}`);
  await mkdir(root);
  try {
    for (const kit of kits) {
      const zip = join(root, `${kit.slug}.zip`);
      const directory = join(root, kit.slug);
      await writeFile(zip, createStarterZip(kit));
      const names = JSON.parse(execFileSync('python3', [
        '-c',
        'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps(z.namelist()))',
        zip,
      ], { encoding: 'utf8' }));
      assert.ok(names.length > 0 && names.every((name: string) => name.startsWith(`${kit.slug}/`)), `${kit.slug} archive has one slug root`);
      execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, root]);
      for (const [name, contents] of Object.entries(starterFiles(kit))) {
        assert.equal(await readFile(join(directory, name), 'utf8'), contents, `${kit.slug}/${name} extracts byte-for-byte`);
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('API starter ZIPs contain the offline sample helper byte-for-byte', async () => {
  const source = await readFile(new URL('../data/sample-helpers.mjs', import.meta.url), 'utf8');
  const apiKits = kits.filter(kit => kit.usesInvestecApi);
  assert.ok(apiKits.length > 0, 'At least one kit uses the shared sample helper.');
  assert.doesNotMatch(source, /fetch\(|oauth|INVESTEC_|transfermultiple|openapi\.investec/i, 'the sample helper must stay offline');

  for (const kit of apiKits) {
    const files = zipFiles(createStarterZip(kit));
    const bundled = files.get(`${kit.slug}/sample-helpers.mjs`);
    assert.equal(bundled, source, `${kit.slug} ZIP must include the exact current sample helper source.`);
    assert.doesNotMatch(bundled ?? '', /fetch\(|oauth|INVESTEC_|transfermultiple|openapi\.investec/i, `${kit.slug} bundled helper must stay offline`);
  }
});
