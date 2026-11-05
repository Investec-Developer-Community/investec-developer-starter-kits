import { test } from 'node:test';
import assert from 'node:assert/strict';
import { officialDocs } from '../data/official-api';
import { downloadOfficial, extractContract, type Contract } from './official-contract-fetch';
import { canonical, compareContracts, contractHash, parseBaseline, reviewOfficialContracts, type Baseline } from './official-contract-review';

const spec = (): Contract => ({
  openapi: '3.0.0', info: { title: 'Fixture only', version: '1.0' },
  servers: [{ url: 'https://openapi.investec.com' }],
  paths: { '/accounts': { get: { responses: { '200': { description: 'OK', schema: { $ref: '#/components/schemas/Account' } } } } } },
  components: { schemas: { Account: { type: 'object', properties: { amount: { type: 'string' } }, required: ['amount'] } } },
});
const response = (value: unknown) => (async () => new Response(JSON.stringify(value))) as typeof fetch;
const empty: Baseline = { formatVersion: 1, documents: {} };
const portal = (value: Contract) => `<script>self.__next_f.push([1,${JSON.stringify(`42:["$","component",null,{"spec":${JSON.stringify(value)}}]\n`)}])</script>`;
async function approved() {
  const { candidate } = await reviewOfficialContracts(empty, response(spec()));
  for (const entry of Object.values(candidate.documents)) {
    entry.approval = { reviewedBy: 'Test fixture reviewer', reviewedOn: '2026-01-01', sha256: entry.sha256 };
  }
  return parseBaseline(candidate);
}

test('extracts direct JSON, nested JSON and streamed portal JSON without executing code', () => {
  assert.equal(extractContract(JSON.stringify(spec())).method, 'direct-json');
  assert.deepEqual(extractContract(`<script type="application/json">${JSON.stringify({ spec: spec() })}</script>`).contract, spec());
  assert.deepEqual(extractContract(portal(spec()) + '<script>throw new Error("never run")</script>').contract, spec());
  const data = JSON.stringify({ spec: spec() });
  const split = `<script>self.__next_f.push([1,${JSON.stringify(data.slice(0, 75))}])</script>` +
    `<script>self.__next_f.push([1,${JSON.stringify(data.slice(75))}])</script>`;
  assert.deepEqual(extractContract(split).contract, spec());
});

test('rejects missing, malformed, oversized and ambiguous objects', () => {
  for (const input of ['<html>Sign in</html>', '{"openapi":"3.0.0"}', 'x'.repeat(2_000_001),
    portal(spec()) + portal({ ...spec(), info: { title: 'Different', version: '2' } })]) {
    assert.throws(() => extractContract(input));
  }
  const swagger = { ...spec(), swagger: '2.0' };
  delete swagger.openapi;
  assert.deepEqual(extractContract(JSON.stringify(swagger)).contract, swagger);
});

test('key ordering and whitespace do not cause drift; values, arrays and refs do', () => {
  const before = spec();
  const reordered = Object.fromEntries(Object.entries(before).reverse()) as Contract;
  assert.equal(canonical(before), canonical(reordered));
  assert.equal(contractHash(before), contractHash(reordered));
  assert.equal(compareContracts(before, reordered).total, 0);
  const after = spec();
  after.paths = { '/accounts': { post: { responses: {} } } };
  after.components = { schemas: { Account: { type: 'object', properties: { amount: { type: 'number' } }, required: [] } } };
  after.security = [{ OAuth: ['accounts'] }];
  const report = compareContracts(before, after);
  assert.ok(report.differences.some(d => d.area === 'endpoint' && d.kind === 'removed' && d.pointer.endsWith('/get')));
  assert.ok(report.differences.some(d => d.area === 'endpoint' && d.kind === 'added' && d.pointer.endsWith('/post')));
  assert.ok(report.differences.some(d => d.area === 'schema' && d.pointer.endsWith('/amount/type') && d.before === 'string' && d.after === 'number'));
  assert.ok(report.differences.some(d => d.pointer.endsWith('/required')));
  assert.ok(report.differences.some(d => d.area === 'document' && d.pointer === '/security'));
});

test('pointer escaping, inline request schemas and external reference strings are compared', () => {
  const a = spec(), b = spec();
  a.paths = { '/a~b': { post: { requestBody: { schema: { $ref: 'https://example.com/old.json' } } } } };
  b.paths = { '/a~b': { post: { requestBody: { schema: { $ref: 'https://example.com/new.json' } } } } };
  assert.equal(compareContracts(a, b).differences[0].pointer, '/paths/~1a~0b/post/requestBody/schema/$ref');
});

test('diffs have an explicit bounded listing, never silently pass when truncated', () => {
  const a = spec(), b = spec();
  a.paths = {};
  b.paths = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`/path${i}`, { get: {} }]));
  const result = compareContracts(a, b);
  assert.equal(result.total, 501);
  assert.equal(result.differences.length, 500);
  assert.equal(result.truncated, true);
});

test('missing baseline is review-needed; candidates never inherit approval; no inputs mutate', async () => {
  const report = await reviewOfficialContracts(empty, response(spec()));
  assert.ok(report.needsReview);
  assert.ok(report.results.every(r => r.state === 'missing-approval'));
  const baseline = await approved();
  const original = JSON.stringify(baseline);
  const unchanged = await reviewOfficialContracts(baseline, response(spec()));
  assert.equal(unchanged.needsReview, false);
  assert.ok(Object.values(unchanged.candidate.documents).every(entry => entry.approval === null));
  const changed = await reviewOfficialContracts(baseline, response({ ...spec(), paths: {} }));
  assert.ok(changed.results.every(r => r.state === 'changed'));
  assert.equal(JSON.stringify(baseline), original);
  assert.deepEqual(empty.documents, {});
});

test('tampered baseline, unknown documents, missing approval and invalid dates fail closed', async () => {
  const baseline = await approved();
  for (const change of [
    (b: Baseline) => { b.documents.bank!.sha256 = 'wrong'; },
    (b: Baseline) => { b.documents.bank!.approval!.sha256 = 'wrong'; },
    (b: Baseline) => { b.documents.bank!.sourceUrl = officialDocs.card.url; },
    (b: Baseline) => { b.documents.bank!.approval!.reviewedOn = '2026-02-30'; },
    (b: Baseline) => { b.documents.bank!.approval!.reviewedBy = ''; },
  ]) {
    const copy = structuredClone(baseline);
    change(copy);
    assert.throws(() => parseBaseline(copy));
  }
  assert.throws(() => parseBaseline({ formatVersion: 1, documents: { typo: baseline.documents.bank } }));
  assert.throws(() => parseBaseline({}));
  const unapproved = structuredClone(baseline);
  unapproved.documents.bank!.approval = null;
  assert.equal((await reviewOfficialContracts(parseBaseline(unapproved), response(spec()))).needsReview, true);
});

test('fetch is GET-only and never requests banking servers or external refs', async () => {
  const calls: string[] = [];
  const fetcher = (async (input, init) => {
    calls.push(String(input));
    assert.equal(init?.method, 'GET');
    assert.equal(init?.redirect, 'manual');
    assert.equal(init?.credentials, 'omit');
    return new Response(JSON.stringify(spec()));
  }) as typeof fetch;
  await reviewOfficialContracts(empty, fetcher);
  assert.deepEqual(calls, Object.values(officialDocs).map(d => d.url));
});

test('unsafe initial URLs and redirect targets are rejected before they are fetched', async () => {
  for (const url of ['http://developer.investec.com', 'https://openapi.investec.com/identity/v2/oauth2/token',
    'https://developer.investec.com.evil.test', 'https://user:pass@developer.investec.com',
    'https://developer.investec.com:444', 'https://127.0.0.1', 'https://github.com']) {
    let calls = 0;
    const fetcher = (async () => { calls++; return new Response(null, { status: 302, headers: { location: url } }); }) as typeof fetch;
    await assert.rejects(downloadOfficial(url, fetcher), /Only HTTPS/);
    assert.equal(calls, 0);
    await assert.rejects(downloadOfficial(officialDocs.bank.url, fetcher), /Only HTTPS/);
    assert.equal(calls, 1);
  }
});

test('safe redirects download JSON but still require URL review; loops stop', async () => {
  const baseline = await approved();
  const fetcher = (async (input) => String(input).endsWith('/spec.json')
    ? new Response(JSON.stringify(spec()))
    : new Response(null, { status: 302, headers: { location: '/spec.json' } })) as typeof fetch;
  const report = await reviewOfficialContracts(baseline, fetcher);
  assert.ok(report.results.every(r => r.state === 'redirected'));
  let calls = 0;
  const loop = (async () => { calls++; return new Response(null, { status: 302, headers: { location: '/loop' } }); }) as typeof fetch;
  await assert.rejects(downloadOfficial(officialDocs.bank.url, loop), /redirects/);
  assert.equal(calls, 6);
});

test('HTTP, missing-body, size, stream and timeout failures remain unavailable, not unchanged', async () => {
  for (const status of [403, 404, 429, 500]) {
    const report = await reviewOfficialContracts(empty, (async () => new Response(null, { status })) as typeof fetch);
    assert.ok(report.results.every(r => r.state === 'unavailable'));
    assert.deepEqual(report.candidate.documents, {});
  }
  for (const body of [null, 'x'.repeat(2_000_001)]) {
    await assert.rejects(downloadOfficial(officialDocs.bank.url, (async () => new Response(body)) as typeof fetch));
  }
  await assert.rejects(downloadOfficial(officialDocs.bank.url, (async () =>
    new Response('small', { headers: { 'content-length': '2000001' } })) as typeof fetch), /2 MB/);
  await assert.rejects(downloadOfficial(officialDocs.bank.url, (async () =>
    new Response(new ReadableStream({ start(c) { c.error(new Error('stream failed')); } }))) as typeof fetch), /stream failed/);
  await assert.rejects(downloadOfficial(officialDocs.bank.url,
    (() => new Promise(() => {})) as typeof fetch, 5), /timed out/);
  await assert.rejects(downloadOfficial(officialDocs.bank.url,
    (async () => new Response(new ReadableStream())) as typeof fetch, 5), /timed out/);
});
