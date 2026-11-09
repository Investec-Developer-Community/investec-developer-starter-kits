import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forecast, detectRecurring, reconcile } from '../data/learning-engines.mjs';
import { runwayFixture as runway, recurringFixture as recurring, reconciliationFixture as paid } from '../data/learning-fixtures.ts';
import { learningKits } from '../data/learning-kits.ts';
import { learningEngineSource } from '../data/learning-engine-source.ts';
import { starterFiles, createStarterZip, starterInstructions } from '../lib/starter-bundle.ts';
import { kits } from '../data/kits.ts';
import { apiAlignment } from '../data/official-api.ts';

function withTransactions<T extends { transactions: { data: { transactions: unknown[] } } }>(fixture: T, rows: unknown[]): T {
  return {
    ...fixture,
    transactions: {
      ...fixture.transactions,
      data: { ...fixture.transactions.data, transactions: rows },
    },
  };
}

test('downloaded engine source is byte-identical to browser engine', async () => {
  assert.equal(learningEngineSource, await readFile(new URL('../data/learning-engines.mjs', import.meta.url), 'utf8'));
});
test('runway baseline, purchase and daily ledger are exact', () => {
  const base = forecast(runway);
  assert.equal(base.days.length, 30);
  assert.equal(base.days[0].date, '2026-11-01');
  assert.equal(base.days[29].date, '2026-11-30');
  assert.equal(base.lowestMinor, 100000);
  assert.equal(base.lowestDate, '2026-11-24');
  assert.equal(base.firstShortfall, null);
  const changed = forecast({ ...runway, purchase: { ...runway.purchase, amount: 5000 } });
  assert.equal(changed.firstShortfall, '2026-11-10');
  assert.equal(changed.lowestMinor, -400000);
  for (const row of changed.days) {
    assert.equal(row.closingMinor, row.openingMinor + row.incomeMinor - row.billsMinor - row.dailySpendMinor - row.purchaseMinor);
  }
});
test('runway date boundaries, zero balances, negative opening and invalid data', () => {
  assert.equal(forecast({ ...runway, startDate: '2024-02-01', purchase: { ...runway.purchase, date: '2024-02-29' }, events: [] }).days[29].date, '2024-03-01');
  assert.equal(forecast({ ...runway, balance: { ...runway.balance, data: { ...runway.balance.data, currentBalance: 0 } }, dailySpend: 0, events: [] }).firstShortfall, null);
  assert.equal(forecast({ ...runway, balance: { ...runway.balance, data: { ...runway.balance.data, currentBalance: -0.01 } } }).firstShortfall, '2026-11-01');
  for (const date of ['2026-02-30', 'bad', '2026-12-01']) {
    assert.throws(() => forecast({ ...runway, purchase: { ...runway.purchase, date } }));
  }
  for (const value of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, Number.MAX_VALUE]) {
    assert.throws(() => forecast({ ...runway, dailySpend: value }));
  }
  assert.throws(() => forecast({ ...runway, events: [...runway.events, runway.events[0]] }), /Duplicate/);
  assert.throws(() => forecast({
    ...runway,
    balance: { ...runway.balance, data: { ...runway.balance.data, currentBalance: Number.MAX_SAFE_INTEGER } },
    events: [{ ...runway.events[2], date: runway.startDate }],
    dailySpend: 0,
  }), /safe integer range/);
});
test('recurring requires evidence and normalises merchant names', () => {
  const result = detectRecurring(recurring);
  assert.equal(result.ignored, 1);
  assert.equal(result.results.length, 4);
  assert.equal(result.results.filter(row => row.likely).length, 2);
  const gym = result.results.find(row => row.merchant === 'DEMO GYM')!;
  assert.equal(gym.observations, 3);
  assert.equal(gym.estimatedNextDate, '2026-11-30');
  assert.equal(result.results.find(row => row.merchant === 'DEMO CAFE')!.likely, false);
  assert.match(result.results.find(row => row.merchant === 'DEMO BOOKS')!.reason, /three/);
  const changedRows = structuredClone(recurring.transactions.data.transactions);
  changedRows.find(row => row.uuid === 'gym-2')!.amount = 699;
  assert.equal(detectRecurring(withTransactions(recurring, changedRows)).results.find(row => row.merchant === 'DEMO GYM')!.likely, false);
});
test('recurring leap year, year rollover, gaps and same-day duplicates', () => {
  const fixture = (dates: string[]) => withTransactions(recurring, dates.map((date, index) => ({
    ...recurring.transactions.data.transactions[0], uuid: String(index),
    postingDate: date, valueDate: date, transactionDate: date,
  })));
  assert.equal(detectRecurring(fixture(['2023-11-30', '2023-12-31', '2024-01-31'])).results[0].estimatedNextDate, '2024-02-29');
  assert.equal(detectRecurring(fixture(['2023-12-31', '2024-01-31', '2024-02-29'])).results[0].estimatedNextDate, '2024-03-31');
  assert.equal(detectRecurring(fixture(['2026-01-12', '2026-03-12', '2026-04-12'])).results[0].likely, false);
  assert.equal(detectRecurring(fixture(['2026-01-12', '2026-01-12', '2026-03-12'])).results[0].likely, false);
  assert.deepEqual(detectRecurring(withTransactions(recurring, [])).results, []);
  assert.equal(detectRecurring(withTransactions(recurring, [{ ...recurring.transactions.data.transactions[0], type: 'CREDIT' }])).ignored, 1);
  assert.equal(detectRecurring(withTransactions(recurring, [{
    ...recurring.transactions.data.transactions[0],
    postingDate: '2026-12-01', valueDate: '2026-12-01', transactionDate: '2026-12-01',
  }])).ignored, 1);
});
test('invoice fixture distinguishes paid, partial, overdue, unmatched and ambiguous', () => {
  const result = reconcile(paid);
  assert.deepEqual(result.invoices.map(row => row.status), ['paid', 'partial', 'unpaid', 'unpaid', 'unpaid']);
  assert.deepEqual(result.invoices.map(row => row.overdue), [false, true, true, false, false]);
  assert.deepEqual(result.payments.map(row => row.status), ['matched', 'matched', 'unmatched', 'ambiguous']);
  assert.equal(result.invoices[1].outstandingMinor, 200000);
  assert.equal(result.invoices[3].paidMinor, 0);
});
test('invoice partial sums, due date boundary and exact cents', () => {
  const input = structuredClone(paid);
  const rows = [...input.transactions.data.transactions];
  rows.push({ ...paid.transactions.data.transactions[1], uuid: 'rest', amount: 2000 });
  input.transactions.data.transactions = rows;
  assert.equal(reconcile(input).invoices[1].status, 'paid');
  assert.equal(reconcile(input).invoices[1].overdue, false);
  assert.equal(reconcile({ ...paid, asOf: '2026-11-02' }).invoices[1].overdue, false);
  const tiny = {
    ...paid,
    invoices: [{ ...paid.invoices[0], amount: 0.03 }],
    transactions: {
      ...paid.transactions,
      data: {
        ...paid.transactions.data,
        transactions: [1, 2].map((n, i) => ({
          ...paid.transactions.data.transactions[0], uuid: String(i), amount: n / 100,
        })),
      },
    },
  };
  assert.equal(reconcile(tiny).invoices[0].paidMinor, 3);
});
test('invoice ambiguous, pending, outgoing, future and excess payments never allocate', () => {
  for (const changed of [
    { status: 'PENDING' as const }, { type: 'DEBIT' as const },
    { postingDate: '2026-12-01', valueDate: '2026-12-01', transactionDate: '2026-12-01' },
    { amount: 5000.01 },
  ]) {
    const result = reconcile(withTransactions(paid, [{ ...paid.transactions.data.transactions[0], ...changed }]));
    assert.equal(result.invoices[0].paidMinor, 0);
    assert.equal(result.payments[0].status, 'unmatched');
  }
  assert.throws(() => reconcile(withTransactions(paid, [paid.transactions.data.transactions[0], paid.transactions.data.transactions[0]])), /Duplicate/);
  assert.throws(() => reconcile(withTransactions(paid, [{ ...paid.transactions.data.transactions[0], amount: 0 }])));
});
test('all three engines reject mixed currencies', () => {
  const usdRunway = { ...runway, balance: { ...runway.balance, data: { ...runway.balance.data, currency: 'USD' } } };
  const usdRecurring = { ...recurring, balance: { ...recurring.balance, data: { ...recurring.balance.data, currency: 'USD' } } };
  const usdPaid = { ...paid, balance: { ...paid.balance, data: { ...paid.balance.data, currency: 'USD' } } };
  assert.throws(() => forecast({ ...usdRunway, events: [{ ...runway.events[0], currency: 'USD' }] }), /match the requested currency/);
  assert.throws(() => detectRecurring(usdRecurring), /match the requested currency/);
  assert.throws(() => reconcile(usdPaid), /match the requested currency/);
  assert.throws(() => reconcile({ ...paid, invoices: [{ ...paid.invoices[0], currency: 'USD' }] }), /Mixed currencies/);
});
test('catalogue preserves old kits and routes new examples to bank reference', () => {
  assert.equal(kits.length, 9);
  assert.equal(new Set(kits.map(kit => kit.slug)).size, 9);
  for (const kit of learningKits) {
    assert.match(apiAlignment(kit.slug).docs[0].url, /Account/);
    assert.doesNotMatch(apiAlignment(kit.slug).docs.map(doc => doc.label).join(), /Card/);
    assert.ok(kit.credit?.sourceReview.checkedOn);
    const readme = starterFiles(kit)['README.md'];
    assert.match(readme, /2026-11-04/);
    assert.match(readme, /Licence:/);
    assert.match(readme, /no.*code.*reused|No upstream code|No standalone upstream/i);
  }
});
test('kit display names describe the idea while stable routes and progress identifiers remain fixed', async () => {
  const slugs = [
    'interest-maximiser', 'spend-explorer', 'card-guard',
    'payment-pinger', 'card-to-sheet-sync', 'swipe-n-save',
    'cashflow-runway', 'recurring-payment-detective', 'who-paid',
  ];
  assert.deepEqual(kits.map(kit => kit.slug), slugs);
  assert.deepEqual(kits.map(kit => `/kits/${kit.slug}`), slugs.map(slug => `/kits/${slug}`));
  assert.ok(kits.every(kit => !/mock/i.test(`${kit.name} ${kit.tagline}`)));

  const cardGuard = kits.find(kit => kit.slug === 'card-guard')!;
  assert.equal(cardGuard.name, 'Card Guard');
  assert.equal(cardGuard.tagline, 'Apply your rules to fictional card purchases.');
  assert.deepEqual(cardGuard.checklist.map(step => step.id), ['download', 'run', 'limit', 'block', 'limits']);
  assert.doesNotMatch(cardGuard.script, /Mock Card Rules/);

  const [router, starterBundle, localStore] = await Promise.all([
    readFile(new URL('../App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/starter-bundle.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/local.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(router, /<Route path="\/kits\/:slug" component=\{KitDetail\} \/>/);
  assert.match(starterBundle, /link\.download = `\$\{kit\.slug\}-starter\.zip`;/);
  assert.match(localStore, /const KEY = 'launchpad\.v1';/);
});
test('account fixtures use only documented bank fields and major-unit amounts', async () => {
  const baseline = JSON.parse(await readFile(new URL('../../../../scripts/official-api-baseline.json', import.meta.url), 'utf8'));
  const schemas = baseline.documents.bank.contract.components.schemas;
  const transactionFields = new Set(Object.keys(schemas.Transaction.properties));
  const pendingFields = new Set(Object.keys(schemas.PendingTransaction.properties));
  const balanceFields = new Set(Object.keys(schemas.AccountBalance.properties));
  const accountFields = new Set(Object.keys(schemas.Account.properties));
  const accountKits = kits.filter(kit => kit.usesInvestecApi);

  assert.equal(accountKits.length, 5);
  const assertEnvelope = (envelope: any, label: string) => {
    assert.deepEqual(Object.keys(envelope).sort(), ['data', 'links', 'meta'], `${label} uses the documented envelope`);
    assert.equal(typeof envelope.links.self, 'string', `${label} has the documented self link`);
    assert.ok(Number.isInteger(envelope.meta.totalPages), `${label} has integer totalPages metadata`);
  };
  for (const kit of accountKits) {
    const data = kit.mockData as any;
    if (data.accounts) {
      assertEnvelope(data.accounts, `${kit.slug} accounts`);
      for (const row of data.accounts.data.accounts) {
        assert.deepEqual(Object.keys(row).filter(key => !accountFields.has(key)), [], `${kit.slug} has no undocumented account fields`);
      }
    }
    if (data.transactions) assertEnvelope(data.transactions, `${kit.slug} transactions`);
    if (data.pendingTransactions) assertEnvelope(data.pendingTransactions, `${kit.slug} pending transactions`);
    for (const row of data.transactions?.data.transactions ?? []) {
      assert.deepEqual(Object.keys(row).filter(key => !transactionFields.has(key)), [], `${kit.slug} has no undocumented transaction fields`);
      assert.equal(typeof row.amount, 'number', `${kit.slug} transaction amount uses the documented numeric major-unit field`);
      assert.ok(!Object.hasOwn(row, 'postedOrder'), `${kit.slug} does not imply postedOrder semantics`);
      assert.ok(schemas.Transaction.properties.type.enum.includes(row.type));
      assert.ok(schemas.Transaction.properties.status.enum.includes(row.status));
    }
    for (const row of data.pendingTransactions?.data.transactions ?? []) {
      assert.deepEqual(Object.keys(row).filter(key => !pendingFields.has(key)), [], `${kit.slug} has no undocumented pending fields`);
      assert.equal(typeof row.amount, 'number');
      assert.ok(schemas.PendingTransaction.properties.type.enum.includes(row.type));
      assert.ok(schemas.PendingTransaction.properties.status.enum.includes(row.status));
    }
    for (const balance of Object.values(data.balances ?? {})) {
      assertEnvelope(balance, `${kit.slug} balance`);
      const body = (balance as any).data;
      assert.deepEqual(Object.keys(body).filter(key => !balanceFields.has(key)), [], `${kit.slug} has no undocumented balance fields`);
    }
    if (data.balance) {
      assertEnvelope(data.balance, `${kit.slug} balance`);
      assert.deepEqual(Object.keys(data.balance.data).filter(key => !balanceFields.has(key)), [], `${kit.slug} has no undocumented balance fields`);
    }
  }
  for (const fixture of [runway, recurring, paid]) {
    assertEnvelope(fixture.transactions, 'learning-kit transactions');
    assertEnvelope(fixture.balance, 'learning-kit balance');
    assert.deepEqual(
      Object.keys(fixture.balance.data).filter(key => !balanceFields.has(key)),
      [],
      'learning-kit balances use documented fields',
    );
    assert.equal(fixture.transactions.meta.totalPages, 1);
    for (const row of fixture.transactions.data.transactions) {
      assert.equal(typeof row.amount, 'number');
      assert.ok(!Object.hasOwn(row, 'postedOrder'));
      assert.ok(schemas.Transaction.properties.type.enum.includes(row.type));
      assert.ok(schemas.Transaction.properties.status.enum.includes(row.status));
    }
  }
});
test('ZIPs extract with valid CRCs and commands run identical engine results, including edits', async () => {
  const parent = resolve(process.cwd(), '.test-work');
  await mkdir(parent, { recursive: true });
  const root = join(parent, `learning-kits-${process.pid}-${Date.now()}`);
  await mkdir(root);
  try {
    const calculate = [forecast, detectRecurring, reconcile] as const;
    for (const [index, kit] of learningKits.entries()) {
      const zip = join(root, `${kit.slug}.zip`), dir = join(root, kit.slug);
      await writeFile(zip, createStarterZip(kit));
      const names = JSON.parse(execFileSync('python3', ['-c', 'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps(z.namelist()))', zip], { encoding: 'utf8' }));
      assert.ok(names.length > 0 && names.every((name: string) => name.startsWith(`${kit.slug}/`)));
      execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, root]);
      for (const [name, contents] of Object.entries(starterFiles(kit))) assert.equal(await readFile(join(dir, name), 'utf8'), contents);
      const command = starterInstructions(kit).command.split(' ');
      const run = () => JSON.parse(execFileSync(process.execPath, command.slice(1), {
        cwd: dir,
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '',
          TEST_FETCH_MODE: 'deny',
          NODE_OPTIONS: `--import=${fileURLToPath(new URL('../../../../scripts/test-fetch-local-only.mjs', import.meta.url))}`,
        },
      }));
      // The union is selected by the same index as the corresponding fixture.
      const compute = calculate[index] as (input: unknown) => unknown;
      const jsonValue = (value: unknown) => JSON.parse(JSON.stringify(value));
      assert.deepEqual(run(), jsonValue(compute(jsonValue(kit.mockData))));
      const input = structuredClone(kit.mockData) as any;
      if (index === 0) input.purchase.amount = 5000;
      if (index === 1) input.transactions.data.transactions.find((row: any) => row.uuid === 'gym-2').amount = 699;
      if (index === 2) input.transactions.data.transactions.find((row: any) => row.uuid === 'pay-2').amount = 3000;
      await writeFile(join(dir, kit.dataFile), JSON.stringify(input));
      assert.deepEqual(run(), jsonValue(compute(jsonValue(input))));
      input.balance.data.currency = 'USD';
      await writeFile(join(dir, kit.dataFile), JSON.stringify(input));
      const failure = spawnSync(process.execPath, command.slice(1), {
        cwd: dir,
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '',
          TEST_FETCH_MODE: 'deny',
          NODE_OPTIONS: `--import=${fileURLToPath(new URL('../../../../scripts/test-fetch-local-only.mjs', import.meta.url))}`,
        },
      });
      assert.equal(failure.status, 1);
      assert.match(failure.stderr, /match the requested currency/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
