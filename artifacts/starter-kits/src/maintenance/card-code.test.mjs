import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { kits } from '../data/kits.ts';
import { createStarterZip } from '../lib/starter-bundle.ts';
import { officialDocs, sampleShapeGuidance } from '../data/official-api.ts';
import { cardRuntimeExample } from '../data/api-mappings.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const baselinePath = join(repoRoot, 'scripts/official-api-baseline.json');
const codeOperation = '/za/v1/cards/{cardKey}/code';
const executeOperation = '/za/v1/cards/{cardKey}/code/execute';
const codePointer = '/paths/~1za~1v1~1cards~1{cardKey}~1code/get/responses/200/content/application~1json/example/data/result/code';
const executePointer = '/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/requestBody/content/application~1json/schema/example';

function zipFiles(zip) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const files = new Map();
  let offset = 0;
  while (offset + 30 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const size = view.getUint32(offset + 18, true);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(zip.subarray(nameStart, nameStart + nameLength));
    files.set(name, decoder.decode(zip.subarray(contentStart, contentStart + size)));
    offset = contentStart + size;
  }
  return files;
}

const authorizationPointer = '/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/responses/200/content/application~1json/example/data/result/0/logs/0/content';
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function leafTypes(value, prefix = '') {
  const leaves = new Map();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') {
      for (const [childPath, type] of leafTypes(child, path)) leaves.set(childPath, type);
    } else {
      leaves.set(path, typeof child);
    }
  }
  return leaves;
}

function objectPaths(value, prefix = '') {
  const paths = new Set();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.add(path);
    if (child && typeof child === 'object') for (const childPath of objectPaths(child, path)) paths.add(childPath);
  }
  return paths;
}

function hookBody(source, hook) {
  const start = source.indexOf(`const ${hook} = async`);
  assert.ok(start >= 0, `${hook} is defined`);
  const end = source.indexOf('\n};', start);
  return source.slice(start, end);
}

function fieldReads(source, variable) {
  return [...source.matchAll(new RegExp(`\\b${variable}((?:\\.[A-Za-z_$][\\w$]*)+)`, 'g'))]
    .map(match => match[1].slice(1))
    .filter(path => !/\.(?:includes|toFixed|padEnd|padStart)$/.test(path));
}

test('Card Guard ZIP contains a documented hook sample and fixtures shaped like the official authorization', async () => {
  const kit = kits.find(candidate => candidate.slug === 'card-guard');
  assert.ok(kit);
  const files = zipFiles(createStarterZip(kit));
  const sample = files.get('card-guard/card-code/main.js');
  const sampleReadme = files.get('card-guard/card-code/README.md');
  const harness = files.get('card-guard/simulate-card-code.mjs');
  const rules = files.get('card-guard/card-rules.mjs');
  const fixtureText = files.get('card-guard/fixtures/authorizations/fictional-authorizations.json');
  const readme = files.get('card-guard/README.md');
  assert.ok(sample && sampleReadme && harness && rules && fixtureText && readme);
  assert.ok([...files.keys()].every(name => name.startsWith('card-guard/')));
  assert.ok(![...files.keys()].some(name => name.includes('local-placeholder')));
  for (const text of [readme, sampleReadme]) {
    assert.match(text, /node simulate-card-code\.mjs/);
    assert.match(text, /not an Investec IDE replica/);
    assert.match(text, new RegExp(escapeRegExp(codePointer)));
    assert.match(text, new RegExp(escapeRegExp(authorizationPointer)));
    assert.match(text, /`afterDecline` argument fields/);
    assert.match(text, /whether `afterTransaction` also runs after a decline/);
  }
  assert.match(readme, new RegExp(escapeRegExp(executePointer)));
  assert.match(readme, /returns `true` to approve or `false` to decline/);
  assert.match(sampleReadme, /community-wiki\/blob\/[0-9a-f]{40}\/get-started\/card-quick-start-guide\/how-to-add-code-to-your-card\.md/);

  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const contract = baseline.documents.card.contract;
  const documentedCode = contract.paths[codeOperation].get.responses['200'].content['application/json'].example.data.result.code;
  const executeExample = contract.paths[executeOperation].post.requestBody.content['application/json'].schema.example;
  const executions = contract.paths[executeOperation].post.responses['200'].content['application/json'].example.data.result;
  for (const hook of ['beforeTransaction', 'afterTransaction', 'afterDecline']) {
    assert.match(documentedCode, new RegExp(`const ${hook} = async`));
    assert.match(sample, new RegExp(`const ${hook} = async`));
  }
  assert.match(documentedCode, /const beforeTransaction = async \(authorization\)/);
  assert.match(documentedCode, /const afterTransaction = async \(transaction\)/);
  assert.match(documentedCode, /const afterDecline = async \(transaction\)/);
  assert.match(documentedCode, /limited execution time/);
  assert.deepEqual(Object.keys(executeExample), [
    'simulationcode', 'centsAmount', 'currencyCode', 'merchantCode', 'merchantName', 'merchantCity', 'countryCode',
  ]);

  // The official simulation example logs console.log(authorization) from the code template.
  assert.equal(executions[0].type, 'before_transaction');
  assert.equal(executions[0].authorizationApproved, true);
  assert.match(executeExample.simulationcode, /console\.log\(authorization\);\s*return true;/);
  const documentedAuthorization = JSON.parse(executions[0].logs[0].content);
  assert.equal(executions[1].type, 'after_transaction');
  assert.equal(executions[1].authorizationApproved, null);
  const documentedTransaction = JSON.parse(executions[1].logs[0].content);
  const documentedLeaves = leafTypes(documentedAuthorization);
  assert.deepEqual([...leafTypes(documentedTransaction)], [...documentedLeaves]);
  assert.deepEqual([...documentedLeaves.keys()], [
    'accountNumber', 'dateTime', 'centsAmount', 'currencyCode', 'type', 'reference', 'card.id',
    'merchant.category.code', 'merchant.category.key', 'merchant.category.name', 'merchant.name', 'merchant.city',
    'merchant.country.code', 'merchant.country.alpha3', 'merchant.country.name',
  ]);
  assert.equal(documentedLeaves.get('centsAmount'), 'number');
  assert.equal(documentedLeaves.get('merchant.category.code'), 'string');

  const fixture = JSON.parse(fixtureText);
  assert.equal(fixture.sourcePointer, authorizationPointer);
  assert.match(fixture.provenance, /every value is invented/);
  assert.match(fixture.provenance, /complete authorization field list is not documented/);
  assert.equal(fixture.authorizations.length, 4);
  for (const authorization of fixture.authorizations) {
    assert.deepEqual([...leafTypes(authorization)], [...documentedLeaves], `${authorization.merchant.name} matches the documented shape`);
    assert.notEqual(authorization.accountNumber, documentedAuthorization.accountNumber);
    assert.notEqual(authorization.card.id, documentedAuthorization.card.id);
    assert.ok(Number.isInteger(authorization.centsAmount) && authorization.centsAmount > 0);
  }

  const documentedPaths = objectPaths(documentedAuthorization);
  const beforeReads = fieldReads(hookBody(sample, 'beforeTransaction'), 'authorization');
  const afterReads = fieldReads(hookBody(sample, 'afterTransaction'), 'transaction');
  assert.deepEqual([...new Set(beforeReads)].sort(), ['centsAmount', 'merchant.category.code']);
  assert.deepEqual([...new Set(afterReads)].sort(), ['centsAmount', 'merchant.name']);
  for (const path of [...beforeReads, ...afterReads]) assert.ok(documentedPaths.has(path), `${path} is a documented field`);
  assert.deepEqual(fieldReads(hookBody(sample, 'afterDecline'), 'transaction'), []);
  assert.doesNotMatch(sample, /\b(?:process\.env|require\s*\(|fetch\s*\(|from\s+['"]node:)/);
  assert.doesNotMatch(harness, /\b(?:process\.env|fetch\s*\(|dotenv)\b/i);
  assert.match(harness, /timeout:\s*localTimeoutMs/);
  assert.match(harness, /microtaskMode:\s*'afterEvaluate'/);
  assert.match(rules, /export function decide/);

  const tempRoot = join(repoRoot, '.test-work', `card-code-${process.pid}-${Date.now()}`);
  const kitDir = join(tempRoot, 'card-guard');
  const archivePath = join(tempRoot, 'card-guard.zip');
  try {
    await mkdir(tempRoot, { recursive: true });
    await writeFile(archivePath, createStarterZip(kit));
    execFileSync('python3', [
      '-c',
      'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',
      archivePath,
      tempRoot,
    ]);

    const rulesOutput = execFileSync('node', ['card-guard.mjs', 'card-guard-mock-data.json'], {
      cwd: kitDir, encoding: 'utf8',
    });
    const harnessOutput = execFileSync('node', ['simulate-card-code.mjs'], {
      cwd: kitDir, encoding: 'utf8',
    });
    const linesWith = (output, prefix) => output.split('\n').filter(line => line.startsWith(prefix));
    const decisions = lines => lines.map(line => line.match(/(APPROVE|DECLINE)\s+(.+?)\s+R /).slice(1, 3).join(' '));
    assert.match(rulesOutput, /APPROVE\s+Takealot/);
    assert.match(rulesOutput, /DECLINE\s+Sasol Rivonia/);
    assert.match(rulesOutput, /DECLINE\s+Lucky Spin Online/);
    assert.deepEqual(
      linesWith(harnessOutput, '[local rules] ').map(line => line.replace('[local rules] ', '')),
      rulesOutput.split('\n').filter(line => line.includes('APPROVE') || line.includes('DECLINE')),
    );
    assert.deepEqual(decisions(linesWith(harnessOutput, '[card code] ')), [
      'APPROVE Takealot', 'DECLINE Sasol Rivonia', 'DECLINE Lucky Spin Online', 'APPROVE Spar Kloof Street',
    ]);
    assert.deepEqual(decisions(linesWith(harnessOutput, '[card code] ')), decisions(linesWith(harnessOutput, '[local rules] ')));
    assert.match(harnessOutput, /LOCAL TEACHING MODEL — not an Investec IDE replica/);
    assert.match(harnessOutput, /\[card code\] APPROVE\s+Takealot\s+R 899,00\s+returned true; ran afterTransaction/);
    assert.match(harnessOutput, /\[card code\] DECLINE\s+Lucky Spin Online\s+R 200,00\s+returned false; ran afterDecline/);
    assert.match(harnessOutput, /\[hook log\] afterTransaction: Takealot 89900 cents/);
    assert.match(harnessOutput, /\[hook log\] afterDecline: transaction declined/);
    assert.match(harnessOutput, /Not documented, so not simulated: afterDecline argument fields/);

    const moduleUrl = pathToFileURL(join(kitDir, 'simulate-card-code.mjs')).href;
    const { runBeforeTransaction, simulateAuthorization } = await import(moduleUrl);
    const sampleSource = await readFile(join(kitDir, 'card-code/main.js'), 'utf8');
    const [approve, , declineCategory] = fixture.authorizations;

    const approved = await simulateAuthorization(sampleSource, approve);
    assert.equal(approved.approved, true);
    assert.equal(approved.afterHook, 'afterTransaction');
    assert.deepEqual(approved.after.hookLogs, [['afterTransaction: Takealot 89900 cents']]);
    const declined = await simulateAuthorization(sampleSource, declineCategory);
    assert.equal(declined.approved, false);
    assert.equal(declined.afterHook, 'afterDecline');
    assert.deepEqual(declined.after.hookLogs, [['afterDecline: transaction declined']]);
    const overLimit = await runBeforeTransaction(sampleSource, { ...approve, centsAmount: 150001 });
    assert.equal(overLimit.value, false);
    const atLimit = await runBeforeTransaction(sampleSource, { ...approve, centsAmount: 150000 });
    assert.equal(atLimit.value, true);

    const nonBoolean = await simulateAuthorization('const beforeTransaction = async () => "yes";', approve);
    assert.equal(nonBoolean.approved, null);
    assert.equal(nonBoolean.afterHook, null);
    const beforeOnly = await simulateAuthorization('const beforeTransaction = async (authorization) => authorization.centsAmount < 5000;', approve);
    assert.equal(beforeOnly.approved, false);
    assert.equal(beforeOnly.after.defined, false);
    await assert.rejects(simulateAuthorization('const afterDecline = async () => {};', approve), /must define beforeTransaction/);
    await assert.rejects(
      runBeforeTransaction('const beforeTransaction = async () => { while (true) {} };', approve),
      /Script execution timed out/,
    );
    await assert.rejects(
      runBeforeTransaction('const beforeTransaction = async () => await new Promise(() => {});', approve),
      /Local sample execution timed out/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('Card Guard page exposes the catalogue command and evidence-bounded sample guidance', async () => {
  const kit = kits.find(candidate => candidate.slug === 'card-guard');
  assert.ok(kit);
  const cardCodeStep = kit.setup.find(step => step.title === 'Try the card-code teaching model');
  assert.equal(cardCodeStep?.code, 'node simulate-card-code.mjs');

  const page = await readFile(new URL('../pages/kit-detail.tsx', import.meta.url), 'utf8');
  const guide = await readFile(new URL('../components/card-code-sample-guide.tsx', import.meta.url), 'utf8');
  const reference = await readFile(new URL('../components/api-mapping-guide.tsx', import.meta.url), 'utf8');
  const mappings = await readFile(new URL('../data/api-mappings.ts', import.meta.url), 'utf8');

  assert.match(page, /step\.title === 'Try the card-code teaching model'/);
  assert.match(page, /<CardCodeSampleGuide command={cardCodeStep\.code} \/>/);
  assert.match(page, /Starter bundle \(\.zip\): mock rules and card-code sample/);
  assert.match(guide, /aria-labelledby="h-card-code-sample"/);
  assert.match(guide, /<h3 id="h-card-code-sample"/);
  assert.match(guide, /CommandBlock code=\{command\} testId="card-code-run-command"/);
  assert.match(guide, /card-guard\.mjs/);
  assert.match(guide, /card-guard-mock-data\.json/);
  assert.doesNotMatch(guide, /mock-card-rules/);
  assert.match(guide, /card-code\/main\.js/);
  assert.match(guide, /card-code\/README\.md/);
  assert.match(guide, /simulate-card-code\.mjs/);
  assert.match(guide, /fictional-authorizations\.json/);
  assert.doesNotMatch(guide, /local-placeholder|opaque/);
  assert.match(guide, /It reads only\s+<code> centsAmount<\/code>, <code>merchant\.category\.code<\/code> and <code>merchant\.name<\/code>/);
  assert.match(guide, /<code>true<\/code> approves and <code>false<\/code> declines/);
  assert.match(guide, /\[card code\] DECLINE  Lucky Spin Online  returned false; ran afterDecline/);
  assert.match(guide, /<code>afterDecline<\/code> argument fields, the\s+platform time limit and timeout outcomes are not documented/);
  for (const merchant of ['Takealot', 'Sasol Rivonia', 'Lucky Spin Online', 'Spar Kloof Street']) {
    assert.ok(guide.includes(merchant), `page guidance must show the local rules output for ${merchant}`);
  }
  assert.match(guide, /not a production-ready replica of the Investec IDE/);
  assert.match(guide, /Sample output excerpt/);
  assert.ok(guide.includes(`href={officialDocs.card.url}`));
  assert.ok(officialDocs.card.url.startsWith('https://developer.investec.com/api-reference/'));
  assert.ok(sampleShapeGuidance('card-guard').some(note =>
    note.includes('merchant.category.code (a string) is a documented field of the authorization logged in the official /code/execute example'),
  ));
  assert.match(reference, /subset of the documented hook argument fields with fictional values/);
  assert.match(reference, /Runtime hook argument — documented fields, fictional values/);
  assert.match(reference, /complete field list and the afterDecline argument are not documented/);
  assert.match(mappings, /runtime merchant\.name/);
  assert.match(mappings, /the hook argument uses a number, as in the official simulation log/);
  assert.doesNotMatch(`${reference}\n${mappings}`, /illustrative, not verified|not verified as a hook field|illustrative and not verified/);
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const logged = JSON.parse(baseline.documents.card.contract.paths[executeOperation].post.responses['200']
    .content['application/json'].example.data.result[0].logs[0].content);
  const documentedPaths = objectPaths(logged);
  for (const path of objectPaths(cardRuntimeExample)) assert.ok(documentedPaths.has(path), `${path} is documented`);
});
