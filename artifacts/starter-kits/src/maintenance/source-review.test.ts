import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kits } from '../data/kits';
import { sourceReviewStatus } from '../data/source-review';
import { checkLink, licenceHash, reviewSources } from './source-review';

const now = new Date('2026-10-14T12:00:00Z');
const url = 'https://api.github.com/repos/example/project/license';
const fetchText = (text: string, status = 200) =>
  (async () => new Response(text, { status })) as typeof fetch;
const approvedKit = () => {
  const kit = structuredClone(kits.find((kit) => kit.origin === 'community')!);
  kit.credit!.sourceReview.checkedOn = '2026-10-14';
  kit.credit!.sourceReview.licenceSha256 = licenceHash('MIT\nCopyright Example');
  return kit;
};

test('official documentation is checked separately without treating HTML as licence text', async () => {
  const report = await reviewSources([], fetchText('<html>Portal</html>'), now);
  assert.equal(report.officialReferences.length, 3);
  assert.ok(report.officialReferences.every(link => link.kind === 'official-doc' && link.state === 'ok' && !link.licenceText));
  assert.equal(report.apiGuidanceReviewedOn, '2026-10-14');
  assert.equal(report.needsReview, false);
});

test('unreachable official docs require review', async () => {
  const report = await reviewSources([], fetchText('', 404), now);
  assert.equal(report.needsReview, true);
  assert.ok(report.officialReferences.every(link => link.state === 'broken'));
});

test('all community kits have source metadata; illustrative kits are skipped', async () => {
  const before = JSON.stringify(kits);
  const report = await reviewSources(kits, fetchText('MIT'), now);
  assert.equal(report.results.length, kits.filter(kit => kit.origin === 'community').length);
  assert.equal(report.skippedIllustrativeKits.length, 2);
  assert.ok(report.results.every((kit) => kit.links.length === 3 && kit.needsReview));
  assert.equal(JSON.stringify(kits), before, 'No metadata or attribution changes');
});

test('unchanged approved licence passes; changed licence needs review', async () => {
  const kit = approvedKit();
  assert.equal((await reviewSources([kit], fetchText('MIT\r\nCopyright Example\n'), now)).needsReview, false);
  const changed = await reviewSources([kit], fetchText('All rights reserved'), now);
  assert.ok(changed.results[0].findings.some((finding) => finding.startsWith('LICENCE CHANGED')));
});

test('missing and old review dates are flagged, invalid/future dates rejected', () => {
  assert.match(sourceReviewStatus(null, now), /not yet recorded/);
  assert.match(sourceReviewStatus('2026-01-01', now), /overdue/);
  for (const date of ['garbage', '2026-02-30', '2027-01-01']) {
    assert.match(sourceReviewStatus(date, now), /correction/);
  }
  assert.match(sourceReviewStatus('2026-10-14', now), /Sources checked/);
});

test('broken links are distinct from rate limits, server errors and network failures', async () => {
  for (const status of [404, 410]) {
    assert.equal((await checkLink('licence', url, fetchText('', status))).state, 'broken');
  }
  for (const status of [403, 429, 500]) {
    assert.equal((await checkLink('licence', url, fetchText('', status))).state, 'unavailable');
  }
  const failure = (async () => { throw new Error('Network timeout'); }) as typeof fetch;
  assert.match((await checkLink('readme', url, failure)).error!, /timeout/);
});

test('unsafe URLs and redirects are blocked without fetching the unsafe target', async () => {
  let calls = 0;
  const redirect = (async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } });
  }) as typeof fetch;
  assert.equal((await checkLink('repository', 'http://127.0.0.1', redirect)).state, 'unavailable');
  assert.equal(calls, 0);
  assert.equal((await checkLink('licence', url, redirect)).state, 'unavailable');
  assert.equal(calls, 1);
});

test('safe redirects are followed and flagged for human review', async () => {
  const fetcher = (async (input) => String(input) === url
    ? new Response(null, { status: 301, headers: { location: 'https://raw.githubusercontent.com/example/project/main/LICENSE' } })
    : new Response('MIT\nCopyright Example')) as typeof fetch;
  const kit = approvedKit();
  kit.credit!.sourceReview.licenceUrl = url;
  const report = await reviewSources([kit], fetcher, now);
  assert.ok(report.results[0].findings.some((finding) => finding.includes('redirected')));
});

test('HTML errors, empty text, JSON and oversized text cannot become licence baselines', async () => {
  for (const text of ['', '<html>Oops</html>', 'x'.repeat(2_000_001)]) {
    const result = await checkLink('licence', url, fetchText(text));
    assert.equal(result.state, 'unavailable');
    assert.equal(result.sha256, undefined);
  }
  const json = (async () => new Response('{"message":"oops"}', {
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
  assert.equal((await checkLink('licence', url, json)).state, 'unavailable');
});

test('redirect loops terminate and missing metadata is reported', async () => {
  const loop = (async () => new Response(null, { status: 302, headers: { location: url } })) as typeof fetch;
  assert.match((await checkLink('licence', url, loop)).error!, /redirects/);
  const kit = approvedKit();
  delete kit.credit;
  const report = await reviewSources([kit], fetchText('MIT'), now);
  assert.deepEqual(report.results[0].findings, ['Missing source review metadata']);
});
