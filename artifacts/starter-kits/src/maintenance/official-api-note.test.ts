import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  apiDownloadNote, apiReadmeGuidance, officialDocs, officialNextStepNote, officialSandboxGuide,
} from '../data/official-api.ts';
import { kits } from '../data/kits.ts';
import { starterFiles } from '../lib/starter-bundle.ts';

test('downloaded API notes teach only documented shapes and labelled local derivations', () => {
  const generated = apiDownloadNote('spend-explorer');
  for (const statement of [
    'data.transactions',
    'CREDIT/DEBIT',
    'POSTED/PENDING',
    '123.45 means R123.45',
    '*Minor and signed amounts are locally derived from amount and type',
    'fromDate, toDate, transactionType and includePending',
    'does not specify date-boundary inclusivity or page-navigation behavior',
    'does not define raw sign semantics',
    'Category labels are local derived fields',
    'Who Paid? compares fictional invoice references with transaction descriptions',
    'has no reference property',
    'official Investec resources below',
  ]) {
    assert.ok(generated.includes(statement), `generated API guidance must state: ${statement}`);
  }
  assert.doesNotMatch(generated, /postedOrder/i);
  assert.ok(generated.includes(officialDocs.bank.url));
  assert.ok(generated.includes(officialDocs.auth.url));
  assert.ok(generated.includes('Official sandbox guide'));
});

test('card sample notes distinguish major units, REST simulation and runtime illustrations', () => {
  const generated = apiDownloadNote('swipe-n-save');
  assert.match(generated, /string centsAmount, currencyCode, numeric merchantCode, merchantName, merchantCity and countryCode/);
  assert.match(generated, /centsAmount: "10000" for R100/);
  assert.match(generated, /not the runtime hook argument/);
  assert.match(generated, /beforeTransaction returns true to approve or false to decline[\s\S]*does not infer a complete runtime event schema, afterDecline argument fields, non-boolean return or timeout behavior, or configuration mechanics/);
  assert.ok(!/curl|client_id|client_secret|x-api-key|\.env|production switch|token setup/i.test(generated));
});

test('catalogue scripts attach the shared account and card guidance', () => {
  for (const slug of ['spend-explorer', 'swipe-n-save']) {
    const kit = kits.find(candidate => candidate.slug === slug);
    assert.ok(kit, `${slug} remains in the catalogue`);
    assert.ok(kit.script.startsWith(apiDownloadNote(slug)), `${slug} script starts with generated shared guidance`);
  }
});

test('generated README guidance shares official resources and sample limitations', () => {
  const readme = apiReadmeGuidance('spend-explorer');
  assert.match(readme, /## Illustrative API notes/);
  assert.match(readme, /data\.transactions/);
  assert.match(readme, /fromDate, toDate, transactionType and includePending/);
  assert.match(readme, /Who Paid\?/);
  assert.ok(readme.includes(officialNextStepNote));
  assert.ok(readme.includes(officialDocs.bank.url));
  assert.match(readme, /Official sandbox guide/);
  assert.ok(!/curl|client_id|client_secret|x-api-key|\.env|production switch|token setup/i.test(readme));
});

test('Getting started, Reference and kit pages use the same guidance component', async () => {
  for (const page of ['getting-started.tsx', 'reference.tsx', 'kit-detail.tsx']) {
    const source = await readFile(new URL(`../pages/${page}`, import.meta.url), 'utf8');
    assert.match(source, /OfficialApiGuidance/);
  }
});

test('user-facing source copy labels local samples and bounds card-code claims', async () => {
  const [index, gettingStarted, reference, kitDetail, guidance, cardGuide, takeItFurther] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../pages/getting-started.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../pages/reference.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../pages/kit-detail.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/official-api-guidance.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/card-code-sample-guide.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/take-it-further.tsx', import.meta.url), 'utf8'),
  ]);
  const cardGuard = kits.find(kit => kit.slug === 'card-guard');
  assert.ok(cardGuard);
  assert.match(cardGuard.summary, /A local teaching model for thinking about card rules/);
  assert.doesNotMatch(cardGuard.summary, /safe sandbox/i);

  assert.match(index, /sample data, aligned with official API and card-code mechanics/);
  assert.match(gettingStarted, /Nothing on it connects to a bank/);
  assert.match(gettingStarted, /Browser demos and downloaded samples use fictional data; they do not connect to a bank/);
  assert.match(reference, /fictional fixtures with documented payloads/);
  assert.match(kitDetail, /fictional mock only, no bank connection/);
  assert.match(kitDetail, /no credentials, no network\. Dry-run on fictional data only/);
  assert.match(guidance, /Official Investec next-step resources/);
  assert.match(cardGuide, /The fixtures copy that documented shape with invented\s+values/);
  assert.match(cardGuide, /is not a production-ready replica of the Investec IDE/);
  assert.match(cardGuide, /does not provide deploy, publish, or live-card steps/);
  assert.match(takeItFurther, /independent projects\. Launchpad links to them but does not connect to or host them/);
  assert.match(takeItFurther, /not an official Investec product/);
  assert.match(cardGuide, /href=\{officialDocs\.card\.url\}/);
  assert.ok(guidance.includes('officialSandboxGuide'));
  assert.ok(Object.values(officialDocs).every(doc => doc.url.startsWith('https://developer.investec.com/')));
  assert.ok(officialSandboxGuide.url.startsWith('https://developer.investec.com/'));
});

test('generated kit READMEs carry the sample-data boundary and official next steps', () => {
  for (const kit of kits) {
    const readme = starterFiles(kit)['README.md'];
    assert.ok(readme.includes(officialNextStepNote), `${kit.slug} README explains the no-bank boundary`);
    assert.ok(readme.includes(officialSandboxGuide.url), `${kit.slug} README links to the official sandbox guide`);
    assert.ok(readme.includes('fictional data only') || readme.includes('Fictional offline data only'), `${kit.slug} README labels sample data`);
    assert.ok(readme.includes('Official sandbox guide'), `${kit.slug} README labels the official next step`);
    for (const doc of Object.values(officialDocs)) {
      if (readme.includes(doc.label)) assert.ok(readme.includes(doc.url), `${kit.slug} README pairs ${doc.label} with its official URL`);
    }
  }
});
