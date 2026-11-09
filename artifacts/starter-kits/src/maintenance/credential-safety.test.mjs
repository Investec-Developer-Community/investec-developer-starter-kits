import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { basename, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { kits } from '../data/kits.ts';
import { createStarterZip, starterFiles } from '../lib/starter-bundle.ts';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const srcRoot = fileURLToPath(new URL('../', import.meta.url));
const scriptsRoot = fileURLToPath(new URL('../../../../scripts/', import.meta.url));
const selfPath = fileURLToPath(import.meta.url);

const placeholder = /^(?:|your[-_ ].*|.*(?:example|placeholder|changeme|redacted|dummy|fake|sample|mock|xxx|\.\.\.).*|<[^>]*>|\$\{[^}]*\}|\*+)$/i;

const secretRules = [
  { name: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'JWT-shaped token', pattern: /\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/ },
  { name: 'bearer token', pattern: /\bBearer\s+(?!\$\{)[A-Za-z0-9._~+/-]{20,}=*/ },
  { name: 'well-known key format', pattern: /\b(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|xox[abprs]-[A-Za-z0-9-]{10,})\b/ },
  {
    name: 'hard-coded credential value',
    pattern: /\b(?:client[_-]?secret|api[_-]?key|x-api-key|access[_-]?token|refresh[_-]?token|auth[_-]?token|password|passwd)['"]?\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/i,
    valueGroup: 1,
  },
  {
    name: '.env-style secret value',
    pattern: /^\s*(?:export\s+)?(?:INVESTEC_[A-Z0-9_]+|[A-Z0-9_]*(?:SECRET|API_KEY|TOKEN|PASSWORD|CLIENT_ID))\s*=\s*['"]?([^'"\s#]+)/,
    valueGroup: 1,
  },
];

// Hosts that only serve documentation pages; anything else on investec.com is treated as an API host.
const docsHosts = new Set(['developer.investec.com', 'www.investec.com', 'investec.com']);
const investecHost = /\b((?:[a-z0-9-]+\.)*investec\.com)(?![\w.-]*\.[a-z])/gi;
const fetchCall = /\b(?:fetch|axios(?:\.\w+)?|got|request|https?\.(?:get|request))\s*\(/;
const envRead = /\b(?:process\.env|import\.meta\.env)(?:\.INVESTEC_|\[\s*['"`]INVESTEC_)/;

// Explicit, minimal allowlist: [repo-relative path, rule, line substring, reason].
const allowlist = [
  ['artifacts/starter-kits/src/maintenance/official-contract-review.test.ts', 'Investec API host', "servers: [{ url: 'https://openapi.investec.com' }]", 'OpenAPI fixture metadata, never fetched'],
  ['artifacts/starter-kits/src/maintenance/official-contract-review.test.ts', 'Investec API host', 'https://openapi.investec.com/identity/v2/oauth2/token', 'asserts the docs downloader rejects API hosts'],
];

const usedAllowances = new Set();

function allowed(file, rule, line) {
  const entry = allowlist.find(([path, ruleName, needle]) => path === file && ruleName === rule && line.includes(needle));
  if (entry) usedAllowances.add(entry);
  return Boolean(entry);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') files.push(...await walk(`${path}/`));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function zipEntries(zip) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const files = new Map();
  let offset = 0;
  while (offset + 30 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, 'starter ZIP entries use the store method');
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    files.set(decoder.decode(zip.subarray(nameStart, nameStart + nameLength)), decoder.decode(zip.subarray(contentStart, contentStart + size)));
    offset = contentStart + size;
  }
  return files;
}

function scan(label, contents, { payload }) {
  const findings = [];
  const envFile = /(^|\/)\.env(\.|$)/.test(label);
  contents.split(/\r?\n/).forEach((line, index) => {
    const report = rule => {
      if (!allowed(label, rule, line)) findings.push(`${label}:${index + 1} [${rule}] ${line.trim().slice(0, 160)}`);
    };
    for (const { name, pattern, valueGroup } of secretRules) {
      if (name === '.env-style secret value' && !envFile && !/^\s*(?:export\s+)?[A-Z0-9_]+\s*=/.test(line)) continue;
      const match = line.match(pattern);
      if (match && !(valueGroup && placeholder.test(match[valueGroup]))) report(name);
    }
    if (envFile) {
      const match = line.match(/^\s*(?:export\s+)?[A-Za-z_][\w]*\s*=\s*['"]?([^'"\s#]*)/);
      if (match && !placeholder.test(match[1])) report('.env file value');
    }
    const apiHosts = [...line.matchAll(investecHost)].map(([, host]) => host.toLowerCase()).filter(host => !docsHosts.has(host));
    if (apiHosts.length > 0 && (payload || fetchCall.test(line) || /https?:\/\//.test(line))) report('Investec API host');
    if (payload && envRead.test(line)) report('process.env.INVESTEC_* read');
  });
  return findings;
}

async function scanFiles(paths) {
  const findings = [];
  for (const path of paths) {
    if (path === selfPath) continue;
    findings.push(...scan(relative(repoRoot, path), await readFile(path, 'utf8'), { payload: false }));
  }
  return findings;
}

function assertClean(findings, scope) {
  if (findings.length > 0) console.error(`Credential-safety findings in ${scope}:\n${findings.join('\n')}`);
  assert.deepEqual(findings, [], `${scope} must not contain secrets or live Investec API targets`);
}

test('starter-kits source tree has no real-looking secrets or Investec API fetch targets', async () => {
  const files = await walk(srcRoot);
  assert.ok(files.length > 50, 'scans the starter-kits source tree');
  assertClean(await scanFiles(files), 'artifacts/starter-kits/src');
  const stale = allowlist.filter(entry => !usedAllowances.has(entry)).map(([path, , needle]) => `${path}: ${needle}`);
  assert.deepEqual(stale, [], 'every allowlist entry still matches a line; remove stale entries');
});

test('maintenance scripts have no real-looking secrets or Investec API fetch targets', async () => {
  const files = (await readdir(scriptsRoot)).filter(name => name.endsWith('.mjs')).map(name => `${scriptsRoot}${name}`);
  assert.ok(files.length > 0, 'scans scripts/*.mjs');
  assertClean(await scanFiles(files), 'scripts/*.mjs');
});

test('every downloadable kit ZIP payload is free of secrets, API hosts and INVESTEC_ env reads', () => {
  assert.ok(kits.length > 0, 'at least one kit is downloadable');
  const findings = [];
  for (const kit of kits) {
    const entries = zipEntries(createStarterZip(kit));
    assert.equal(entries.size, Object.keys(starterFiles(kit)).length, `${kit.slug} ZIP contains every starter file`);
    for (const [name, contents] of entries) {
      findings.push(...scan(`${basename(kit.slug)}.zip:${name}`, contents, { payload: true }));
    }
  }
  assertClean(findings, 'downloadable kit ZIPs');
});

test('scanner flags representative violations', () => {
  const fake = 'sk_' + 'live_' + 'A1b2C3d4E5f6G7h8I9j0';
  assert.equal(scan('x.mjs', `const key = '${fake}';`, { payload: false }).length, 1);
  assert.equal(scan('x.mjs', "headers: { Authorization: 'Bearer abcdefghijklmnopqrstuvwxyz123456' }", { payload: false }).length, 1);
  assert.equal(scan('x.mjs', "const client_secret = 'q8Zr4kLm2Nw7';", { payload: false }).length, 1);
  assert.equal(scan('x.mjs', "const client_secret = 'your-client-secret';", { payload: false }).length, 0);
  assert.equal(scan('kit/.env', 'INVESTEC_CLIENT_ID=abc123real', { payload: true }).length, 2);
  assert.equal(scan('kit/.env.example', 'INVESTEC_CLIENT_ID=', { payload: true }).length, 0);
  assert.equal(scan('x.mjs', "await fetch('https://openapi.investec.com/za/pb/v1/accounts');", { payload: false }).length, 1);
  assert.equal(scan('x.mjs', "const host = 'openapi.investec.com';", { payload: true }).length, 1);
  assert.equal(scan('x.mjs', 'See https://developer.investec.com/api-reference for docs.', { payload: true }).length, 0);
  assert.equal(scan('x.mjs', 'const id = process.env.INVESTEC_CLIENT_ID;', { payload: true }).length, 1);
  assert.equal(scan('x.mjs', "const id = process.env['INVESTEC_API_KEY'];", { payload: true }).length, 1);
});
