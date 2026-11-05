import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { forecast, detectRecurring, reconcile } from '../data/learning-engines.mjs';
import { runwayFixture as runway, recurringFixture as recurring, reconciliationFixture as paid } from '../data/learning-fixtures';
import { learningKits } from '../data/learning-kits';
import { learningEngineSource } from '../data/learning-engine-source';
import { starterFiles, createStarterZip, starterInstructions } from '../lib/starter-bundle';
import { kits } from '../data/kits';
import { apiAlignment } from '../data/official-api';

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
  const changed = forecast({ ...runway, purchaseMinor: 500000 });
  assert.equal(changed.firstShortfall, '2026-11-10');
  assert.equal(changed.lowestMinor, -400000);
  for (const row of changed.days) {
    assert.equal(row.closingMinor, row.openingMinor + row.incomeMinor - row.billsMinor - row.dailySpendMinor - row.purchaseMinor);
  }
});
test('runway date boundaries, zero balances, negative opening and invalid data', () => {
  assert.equal(forecast({ ...runway, startDate: '2024-02-01', purchaseDate: '2024-02-29', events: [] }).days[29].date, '2024-03-01');
  assert.equal(forecast({ ...runway, startingMinor: 0, dailySpendMinor: 0, events: [] }).firstShortfall, null);
  assert.equal(forecast({ ...runway, startingMinor: -1 }).firstShortfall, '2026-11-01');
  for (const date of ['2026-02-30', 'bad', '2026-12-01']) {
    assert.throws(() => forecast({ ...runway, purchaseDate: date }));
  }
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => forecast({ ...runway, dailySpendMinor: value }));
  }
  assert.throws(() => forecast({ ...runway, events: [...runway.events, runway.events[0]] }), /Duplicate/);
  assert.throws(() => forecast({ ...runway, startingMinor: Number.MAX_SAFE_INTEGER, events: [{ ...runway.events[2], date: runway.startDate }], dailySpendMinor: 0 }), /range/);
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
  const changed = structuredClone(recurring);
  changed.transactions.find(row => row.id === 'gym-2')!.amountMinor = 69900;
  assert.equal(detectRecurring(changed).results.find(row => row.merchant === 'DEMO GYM')!.likely, false);
});
test('recurring leap year, year rollover, gaps and same-day duplicates', () => {
  const fixture = (dates: string[]) => ({ currency: 'ZAR', asOf: '2026-11-04', transactions: dates.map((date, i) => ({
    ...recurring.transactions[0], id: String(i), date,
  })) });
  assert.equal(detectRecurring(fixture(['2023-11-30', '2023-12-31', '2024-01-31'])).results[0].estimatedNextDate, '2024-02-29');
  assert.equal(detectRecurring(fixture(['2023-12-31', '2024-01-31', '2024-02-29'])).results[0].estimatedNextDate, '2024-03-31');
  assert.equal(detectRecurring(fixture(['2026-01-12', '2026-03-12', '2026-04-12'])).results[0].likely, false);
  assert.equal(detectRecurring(fixture(['2026-01-12', '2026-01-12', '2026-03-12'])).results[0].likely, false);
  assert.deepEqual(detectRecurring({ ...recurring, transactions: [] }).results, []);
  assert.equal(detectRecurring({ ...recurring, transactions: [{ ...recurring.transactions[0], type: 'CREDIT' }] }).ignored, 1);
  assert.equal(detectRecurring({ ...recurring, transactions: [{ ...recurring.transactions[0], date: '2026-12-01' }] }).ignored, 1);
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
  input.payments.push({ ...paid.payments[1], id: 'rest', amountMinor: 200000 });
  assert.equal(reconcile(input).invoices[1].status, 'paid');
  assert.equal(reconcile(input).invoices[1].overdue, false);
  assert.equal(reconcile({ ...paid, asOf: '2026-11-02' }).invoices[1].overdue, false);
  const tiny = { ...paid, invoices: [{ ...paid.invoices[0], amountMinor: 3 }], payments: [1, 2].map((n, i) => ({ ...paid.payments[0], id: String(i), amountMinor: n })) };
  assert.equal(reconcile(tiny).invoices[0].paidMinor, 3);
});
test('invoice ambiguous, pending, outgoing, future and excess payments never allocate', () => {
  for (const changed of [
    { status: 'PENDING' as const }, { type: 'DEBIT' as const }, { date: '2026-12-01' }, { amountMinor: 500001 },
  ]) {
    const result = reconcile({ ...paid, payments: [{ ...paid.payments[0], ...changed }] });
    assert.equal(result.invoices[0].paidMinor, 0);
    assert.equal(result.payments[0].status, 'unmatched');
  }
  assert.throws(() => reconcile({ ...paid, payments: [paid.payments[0], paid.payments[0]] }), /Duplicate/);
  assert.throws(() => reconcile({ ...paid, payments: [{ ...paid.payments[0], amountMinor: 0 }] }));
});
test('all three engines reject mixed currencies', () => {
  assert.throws(() => forecast({ ...runway, events: [{ ...runway.events[0], currency: 'USD' }] }), /Mixed currencies/);
  assert.throws(() => detectRecurring({ ...recurring, transactions: [{ ...recurring.transactions[0], currency: 'USD' }] }), /Mixed currencies/);
  assert.throws(() => reconcile({ ...paid, payments: [{ ...paid.payments[0], currency: 'USD' }] }), /Mixed currencies/);
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
test('ZIPs extract with valid CRCs and commands run identical engine results, including edits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'learning-kits-'));
  try {
    const calculate = [forecast, detectRecurring, reconcile] as const;
    for (const [index, kit] of learningKits.entries()) {
      const zip = join(root, `${kit.slug}.zip`), dir = join(root, kit.slug);
      await writeFile(zip, createStarterZip(kit));
      execFileSync('python3', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])', zip, dir]);
      for (const [name, contents] of Object.entries(starterFiles(kit))) assert.equal(await readFile(join(dir, name), 'utf8'), contents);
      const command = starterInstructions(kit).command.split(' ');
      const run = () => JSON.parse(execFileSync(process.execPath, command.slice(1), { cwd: dir, encoding: 'utf8' }));
      // The union is selected by the same index as the corresponding fixture.
      const compute = calculate[index] as (input: unknown) => unknown;
      assert.deepEqual(run(), compute(kit.mockData));
      const input = structuredClone(kit.mockData) as any;
      if (index === 0) input.purchaseMinor = 500000;
      if (index === 1) input.transactions[2].amountMinor = 69900;
      if (index === 2) input.payments[1].amountMinor = 300000;
      await writeFile(join(dir, kit.dataFile), JSON.stringify(input));
      assert.deepEqual(run(), compute(input));
      input.currency = 'USD';
      await writeFile(join(dir, kit.dataFile), JSON.stringify(input));
      const failure = spawnSync(process.execPath, command.slice(1), { cwd: dir, encoding: 'utf8' });
      assert.equal(failure.status, 1);
      assert.match(failure.stderr, /Mixed currencies/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
