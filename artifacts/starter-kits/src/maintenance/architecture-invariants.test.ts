// Architectural invariants that do not need a browser:
// 3) no backend or database dependency, 10) every kit fixture is fictional and runs offline,
// 11) the shared test network guard really blocks live services.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { kits } from '../data/kits.ts';
import { starterFiles, starterInstructions } from '../lib/starter-bundle.ts';

const execFileAsync = promisify(execFile);
const packageJson = fileURLToPath(new URL('../../package.json', import.meta.url));
const fetchGuard = fileURLToPath(new URL('../../../../scripts/test-fetch-local-only.mjs', import.meta.url));

const serverOrDatabasePackage = /^(?:express|fastify|koa|@koa\/.*|@hapi\/.*|hapi|restify|polka|hono|@hono\/.*|next|@nestjs\/.*|nuxt|@remix-run\/(?:node|serve|express)|cors|body-parser|helmet|pino(?:-.*)?|winston|pg|pg-.*|postgres|@neondatabase\/.*|mysql2?|sqlite3?|better-sqlite3|@libsql\/.*|mongodb|mongoose|redis|ioredis|@prisma\/.*|prisma|drizzle-.*|sequelize|typeorm|knex|kysely|firebase(?:-admin)?|@supabase\/.*|@vercel\/postgres|@workspace\/.*|axios|got|ky|node-fetch|undici|socket\.io(?:-client)?|ws|graphql-request|@apollo\/client|openapi-fetch|dotenv)$/;

export function forbiddenDependencies(manifest: Record<string, unknown>) {
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
  return sections.flatMap(section => Object.keys((manifest[section] as Record<string, string> | undefined) ?? {})
    .filter(name => serverOrDatabasePackage.test(name)).map(name => `${section}: ${name}`));
}

test('starter-kits declares no server, database, HTTP-client or workspace backend dependency', async () => {
  const manifest = JSON.parse(await readFile(packageJson, 'utf8'));
  assert.deepEqual(forbiddenDependencies(manifest), []);
  assert.ok(!manifest.dependencies || Object.keys(manifest.dependencies).length === 0,
    'a static site ships no runtime dependencies outside the Vite bundle');
  for (const [name, command] of Object.entries(manifest.scripts as Record<string, string>)) {
    assert.doesNotMatch(command, /\b(?:node|tsx)\s+(?:\S*\/)?(?:server|api|index)\.(?:m?js|ts)\b|\bdrizzle-kit\b|\bprisma\b/, `script ${name} must not start a backend`);
  }
});

test('dependency detector flags representative violations', () => {
  assert.deepEqual(forbiddenDependencies({
    dependencies: { express: '1', react: '1' },
    devDependencies: { 'drizzle-orm': '1', '@workspace/api-client-react': '1', pg: '1', vite: '1' },
  }), ['dependencies: express', 'devDependencies: drizzle-orm', 'devDependencies: @workspace/api-client-react', 'devDependencies: pg']);
});

// Fails the child process if it attempts any network primitive, even if the script catches the error.
const hardNetworkGuard = `
import { syncBuiltinESMExports, createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const attempts = [];
const block = (what) => (...args) => {
  attempts.push(what);
  process.exitCode = 97;
  process.stderr.write('NETWORK_ATTEMPT ' + what + '\\n');
  throw new Error('Kit fixtures must run offline: ' + what);
};
globalThis.fetch = block('fetch');
globalThis.WebSocket = class { constructor() { block('WebSocket')(); } };
for (const name of ['http', 'https']) {
  const mod = require('node:' + name);
  mod.request = block(name + '.request');
  mod.get = block(name + '.get');
}
const net = require('node:net');
net.connect = net.createConnection = block('net.connect');
net.Socket.prototype.connect = block('net.Socket.connect');
require('node:tls').connect = block('tls.connect');
const dns = require('node:dns');
dns.lookup = dns.resolve = block('dns');
dns.promises.lookup = dns.promises.resolve = block('dns.promises');
syncBuiltinESMExports();
process.on('exit', (code) => { if (attempts.length) process.exitCode = 97; });
`;

function luhn(digits: string) {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function realLookingData(text: string) {
  const findings: string[] = [];
  for (const [, digits] of text.matchAll(/(?<!\d)(\d{13,19})(?!\d)/g)) {
    if (luhn(digits!) && !/0{6,}/.test(digits!)) findings.push(`card-number-like value ${digits}`);
  }
  for (const [, key, value] of text.matchAll(/"(accountNumber|accountId|cardNumber|idNumber)"\s*:\s*"([^"]*)"/g)) {
    if (key === 'accountId' && !/^demo[-\w]*$/i.test(value!)) findings.push(`${key} ${value} is not a demo id`);
    if (key === 'accountNumber' && !/0{5,}/.test(value!)) findings.push(`${key} ${value} is not an obvious placeholder`);
    if (key === 'cardNumber' || key === 'idNumber') findings.push(`${key} field present`);
  }
  for (const [email] of text.matchAll(/[\w.+-]+@([\w-]+\.)+[a-z]{2,}/gi)) {
    if (!/@(?:[\w-]+\.)*(?:example\.(?:com|org|net)|example|test|invalid)$/i.test(email)) findings.push(`email ${email}`);
  }
  return findings;
}

test('fixture detector flags representative real-looking data', () => {
  assert.equal(realLookingData('{"pan":"4111111111111111"}').length, 1);
  assert.equal(realLookingData('{"accountId":"3353431574710166878182963"}').length, 1);
  assert.equal(realLookingData('{"accountNumber":"10011234567"}').length, 1);
  assert.equal(realLookingData('{"to":"someone@gmail.com"}').length, 1);
  assert.deepEqual(realLookingData('{"accountId":"demo-loan","accountNumber":"10000000001","to":"a@example.com"}'), []);
});

test('all catalogue kit fixtures are fictional and every starter runs with the network blocked', async () => {
  assert.equal(kits.length, 9, 'update this invariant when the catalogue changes');
  const root = join(resolve(process.cwd(), '.test-work'), `architecture-invariants-${process.pid}-${Date.now()}`);
  const guard = join(root, 'hard-network-guard.mjs');
  try {
    await mkdir(root, { recursive: true });
    await writeFile(guard, hardNetworkGuard);
    for (const kit of kits) {
      const files = starterFiles(kit);
      const directory = join(root, kit.slug);
      const jsonFiles = Object.keys(files).filter(name => name.endsWith('.json'));
      assert.ok(jsonFiles.includes(kit.dataFile), `${kit.slug} ships its fixture ${kit.dataFile}`);
      assert.deepEqual(JSON.parse(files[kit.dataFile]!), kit.mockData, `${kit.slug} fixture is the catalogue mock data`);
      for (const name of jsonFiles) {
        JSON.parse(files[name]!);
        assert.deepEqual(realLookingData(files[name]!), [], `${kit.slug}/${name} contains real-looking data`);
      }
      assert.match(files['README.md']!, /fictional/i, `${kit.slug} README states the data is fictional`);
      for (const [name, contents] of Object.entries(files)) {
        await mkdir(dirname(join(directory, name)), { recursive: true });
        await writeFile(join(directory, name), contents);
      }
      const { command, expected } = starterInstructions(kit);
      const [, ...args] = command.split(' ');
      const documentedExit = Number(expected.match(/exit code is (\d+)/)?.[1] ?? 0);
      let result: { stdout: string; stderr: string; code: number };
      try {
        const { stdout, stderr } = await execFileAsync(process.execPath, args, {
          cwd: directory, encoding: 'utf8', timeout: 15_000,
          env: { PATH: process.env.PATH ?? '', NODE_OPTIONS: `--import=${guard}` },
        });
        result = { stdout, stderr, code: 0 };
      } catch (error) {
        const failure = error as { stdout?: string; stderr?: string; code?: number };
        result = { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '', code: failure.code ?? 1 };
      }
      assert.doesNotMatch(result.stderr, /NETWORK_ATTEMPT/, `${kit.slug} attempted network access`);
      assert.equal(result.code, documentedExit, `${kit.slug} exits with its documented code offline: ${result.stderr}`);
      assert.ok(result.stdout.trim().length > 0, `${kit.slug} prints a result from its fixture`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the hard network guard turns a fixture that reaches the network red', async () => {
  const root = join(resolve(process.cwd(), '.test-work'), `architecture-invariants-guard-${process.pid}-${Date.now()}`);
  try {
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'guard.mjs'), hardNetworkGuard);
    for (const body of [
      "try { await fetch('https://example.invalid/'); } catch {} console.log('ok');",
      "import https from 'node:https'; try { https.get('https://example.invalid/'); } catch {} console.log('ok');",
      "import net from 'node:net'; try { net.connect(443, 'example.invalid'); } catch {} console.log('ok');",
    ]) {
      await writeFile(join(root, 'leaky.mjs'), body);
      await assert.rejects(
        execFileAsync(process.execPath, ['leaky.mjs'], { cwd: root, env: { PATH: process.env.PATH ?? '', NODE_OPTIONS: `--import=${join(root, 'guard.mjs')}` } }),
        (error: { code?: number; stderr?: string }) => error.code === 97 && /NETWORK_ATTEMPT/.test(error.stderr ?? ''),
        body,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the shared test fetch guard denies all requests in deny mode and non-local hosts otherwise', async () => {
  const probe = `
    const results = [];
    for (const url of ['https://example.invalid/', 'http://127.0.0.1:9/']) {
      try { await fetch(url); results.push('allowed ' + url); } catch (error) { results.push(error.message); }
    }
    console.log(JSON.stringify(results));`;
  const run = async (mode?: string) => JSON.parse((await execFileAsync(process.execPath, ['--input-type=module', '-e', probe], {
    env: { PATH: process.env.PATH ?? '', NODE_OPTIONS: `--import=${fetchGuard}`, ...(mode ? { TEST_FETCH_MODE: mode } : {}) },
  })).stdout) as string[];
  assert.deepEqual(await run('deny'), Array(2).fill('This test must not make any network requests.'));
  const local = await run();
  assert.equal(local[0], 'Tests permit HTTP requests only to a local fake server.');
  assert.notEqual(local[1], 'Tests permit HTTP requests only to a local fake server.', 'loopback stays permitted for fake servers');
});
