// Parity: each kit's browser demo path and its downloaded script must reach the same domain results.
// The downloaded script is extracted from the generated starter ZIP and run offline with Node.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kits, computeTransferPreview, decidePurchase, interestDefaultPending, interestFixture, spendTransactionEnvelope, spendTransactions, zar } from '../data/kits.ts';
import { decimalToMinor } from '../data/sample-helpers.mjs';
import { pendingDebitsMinor } from '../data/interest-maximiser-engine.mjs';
import { filterSpendRows, postedDebitTotalsMinor, spendRows } from '../data/spend-explorer-engine.mjs';
import type { AccountTransaction } from '../data/learning-engines.mjs';
import { createStarterZip } from '../lib/starter-bundle.ts';
import type { Kit } from '../data/kits.ts';
import { pingerTxns, sheetTxns, swipeTxns } from '../data/community-kits.ts';
import { previewPing } from '../data/payment-pinger-engine.mjs';
import { buildSheetRows, rowsToCsv } from '../data/card-to-sheet-sync-engine.mjs';
import { simulateSwipe } from '../data/swipe-n-save-engine.mjs';

const root = join(resolve(process.cwd(), '.test-work'), `kit-parity-${process.pid}-${Date.now()}`);
const guard = fileURLToPath(new URL('../../../../scripts/test-fetch-local-only.mjs', import.meta.url));
after(() => rm(root, { recursive: true, force: true }));

function kit(slug: string): Kit {
  const found = kits.find(candidate => candidate.slug === slug);
  assert.ok(found, `${slug} must be registered`);
  return found;
}

async function extract(slug: string) {
  await mkdir(root, { recursive: true });
  const archive = join(root, `${slug}.zip`);
  await writeFile(archive, createStarterZip(kit(slug)));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, root]);
  return join(root, slug);
}

function run(directory: string, args: string[]) {
  return execFileSync(process.execPath, args, {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15_000,
    env: { PATH: process.env.PATH ?? '', TEST_FETCH_MODE: 'deny', NODE_OPTIONS: `--import=${guard}` },
  });
}

test('Card Guard: browser decisions and reasons match the downloaded card-guard.mjs (en-ZA amounts)', async () => {
  const cardGuard = kit('card-guard');
  assert.equal(cardGuard.scriptFile, 'card-guard.mjs');
  assert.equal(cardGuard.dataFile, 'card-guard-mock-data.json');
  const shipped = cardGuard.mockData as { rules: { spendLimit: number; blockedCategories: string[] }; purchases: { merchant: string; merchantCategory: string; amount: number }[] };
  const scenarios = [
    shipped,
    {
      rules: { spendLimit: 1234567.5, blockedCategories: ['gambling', 'Travel'] },
      purchases: [
        { merchant: 'At the limit', merchantCategory: 'Fuel', amount: 1234567.5 },
        { merchant: 'One cent over', merchantCategory: 'Fuel', amount: 1234567.51 },
        { merchant: 'Case-insensitive block', merchantCategory: 'GAMBLING', amount: 10 },
        { merchant: 'Zero amount', merchantCategory: 'Groceries', amount: 0 },
        { merchant: 'Negative amount', merchantCategory: 'Groceries', amount: -5 },
      ],
    },
  ];
  const directory = await extract('card-guard');
  for (const [index, scenario] of scenarios.entries()) {
    const dataFile = `parity-${index}.json`;
    await writeFile(join(directory, dataFile), JSON.stringify(scenario));
    const lines = run(directory, ['card-guard.mjs', dataFile]).split('\n').filter(line => /^(APPROVE|DECLINE) /.test(line));
    const downloaded = lines.map(line => {
      const match = /^(APPROVE|DECLINE) {2}(.+?)\s+(R -?[\d\u00a0]+,\d{2}) {2}(.+)$/.exec(line);
      assert.ok(match, `unexpected CLI line: ${line}`);
      return { approved: match[1] === 'APPROVE', merchant: match[2], amount: match[3], reason: match[4] };
    });
    const browser = scenario.purchases.map(purchase => ({
      ...decidePurchase(purchase, scenario.rules),
      merchant: purchase.merchant,
      amount: zar(purchase.amount),
    }));
    assert.deepEqual(downloaded, browser, `scenario ${index}`);
  }
  assert.equal(decidePurchase({ amount: 1720.55, merchantCategory: 'Fuel' }, shipped.rules).reason, 'Amount exceeds limit of R 1\u00a0500,00');
});

test('Card Guard: the simulate-card-code comparison uses the same rules engine output', async () => {
  const directory = await extract('card-guard');
  const rules = run(directory, ['card-guard.mjs', 'card-guard-mock-data.json']).split('\n').filter(line => /^(APPROVE|DECLINE) /.test(line));
  const harness = run(directory, ['simulate-card-code.mjs']).split('\n')
    .filter(line => line.startsWith('[local rules] ')).map(line => line.slice('[local rules] '.length));
  assert.equal(rules.length, 4);
  assert.deepEqual(harness, rules);
});

test('rand formatting is explicit en-ZA and independent of host locale data', () => {
  const cases: [number, string][] = [
    [0, 'R 0,00'], [0.5, 'R 0,50'], [999.999, 'R 1\u00a0000,00'], [1500, 'R 1\u00a0500,00'],
    [1720.55, 'R 1\u00a0720,55'], [-1284330.12, 'R -1\u00a0284\u00a0330,12'], [1234567.891, 'R 1\u00a0234\u00a0567,89'],
  ];
  for (const [amount, expected] of cases) assert.equal(zar(amount), expected);
  // Where the host has full en-ZA locale data, the explicit formatter matches Intl (no-break space grouping).
  const intl = (1234567.5).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (intl === '1\u00a0234\u00a0567,50') assert.equal(zar(1234567.5), `R ${intl}`);
});

function parseSpendOutput(stdout: string) {
  const [listing, totals = ''] = stdout.split('Posted debit totals by category:');
  const rows = listing.split('\n').filter(line => /^\d{4}-/.test(line)).map(line => {
    const match = /^(\d{4}-\d{2}-\d{2}) {2}(.+?)\s+R\s+(\d+\.\d{2}) {2}(POSTED|PENDING)$/.exec(line);
    assert.ok(match, `unexpected CLI row: ${line}`);
    return { date: match[1], description: match[2], amountMinor: decimalToMinor(match[3]), status: match[4] };
  });
  const categoryTotals = totals.split('\n').filter(line => line.startsWith('  ')).map(line => {
    const match = /^ {2}(.+?)\s+R (\d+\.\d{2})$/.exec(line);
    assert.ok(match, `unexpected CLI total: ${line}`);
    return [match[1], decimalToMinor(match[2])] as [string, number];
  });
  return { rows, totals: categoryTotals };
}

test('Spend Explorer: browser filters, rows and posted totals match the downloaded spend-explorer.mjs', async () => {
  const directory = await extract('spend-explorer');
  const shipped = kit('spend-explorer').mockData as Record<string, unknown>;
  const custom = {
    ...shipped,
    transactions: {
      ...spendTransactionEnvelope,
      data: {
        transactions: [
          ...spendTransactionEnvelope.data.transactions,
          { accountId: 'demo-spend', type: 'CREDIT', status: 'POSTED', description: 'Uber refund', postingDate: '2025-03-13', amount: 55.5, uuid: 't13' },
          { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Sasol Rivonia', postingDate: '2025-03-14', amount: 0.105, uuid: 't14' },
          { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Bookshop', postingDate: '2025-03-15', amount: 250.1, uuid: 't15' },
        ],
      },
    },
  };
  await writeFile(join(directory, 'parity.json'), JSON.stringify(custom));
  const fixtures: [string, AccountTransaction[]][] = [
    ['./spend-explorer-mock-data.json', spendTransactions as unknown as AccountTransaction[]],
    ['parity.json', custom.transactions.data.transactions as AccountTransaction[]],
  ];
  const filters = [
    { category: 'all', search: '' }, { category: 'Transport', search: 'bolt' }, { category: 'Groceries', search: '' },
    { category: 'Eating out', search: '' }, { category: 'all', search: 'SASOL' }, { category: 'Fuel', search: 'nothing' },
  ];
  for (const [dataFile, transactions] of fixtures) {
    const rows = dataFile === 'parity.json' ? spendRows(transactions) : spendTransactions;
    for (const filter of filters) {
      const browserRows = filterSpendRows(rows, filter);
      const browser = {
        rows: browserRows.map(row => ({ date: row.date, description: row.description, amountMinor: row.amountMinor, status: row.status })),
        totals: postedDebitTotalsMinor(browserRows),
      };
      const downloaded = parseSpendOutput(run(directory, ['spend-explorer.mjs', dataFile, filter.category, filter.search]));
      assert.deepEqual(downloaded, browser, `${dataFile} ${JSON.stringify(filter)}`);
    }
  }
  assert.deepEqual(postedDebitTotalsMinor(spendTransactions)[0], ['Groceries', 136024]);
});

function parseInterestOutput(stdout: string) {
  const minor = (label: RegExp) => {
    const match = label.exec(stdout);
    assert.ok(match, `missing ${label} in:\n${stdout}`);
    const digits = match[2].replace(/[,\u00a0\u202f ]/g, '');
    return (match[1] ? -1 : 1) * decimalToMinor(digits);
  };
  return {
    pendingMinor: minor(/Pending debits held back:(-)?R ([\d,\u00a0\u202f ]+\.\d{2})/),
    transferableMinor: minor(/Transferable estimate:\s+(-)?R ([\d,\u00a0\u202f ]+\.\d{2})/),
    sourceAfterMinor: minor(/After  -> [^:]+: (-)?R ([\d,\u00a0\u202f ]+\.\d{2})/),
    targetAfterMinor: minor(/After  -> .+\| [^:]+: (-)?R ([\d,\u00a0\u202f ]+\.\d{2})/),
  };
}

test('Interest Maximiser: browser preview matches the downloaded interest-maximiser.mjs in minor units', async () => {
  const directory = await extract('interest-maximiser');
  const pendingRow = interestFixture.pendingTransactions.data.transactions[0];
  const cases = [
    { name: 'shipped', balance: 18450.75, pending: [2315.4], reserve: 5000 },
    { name: 'float-sensitive', balance: 0.3, pending: [0.1, 0.1], reserve: 0 },
    { name: 'reserve covers all', balance: 1000, pending: [600], reserve: 400.01 },
    { name: 'exactly zero', balance: 1000, pending: [600], reserve: 400 },
    { name: 'large', balance: 1234567.89, pending: [0.01, 99999.99], reserve: 12345.67 },
  ];
  for (const { name, balance, pending, reserve } of cases) {
    const fixture = structuredClone(interestFixture);
    fixture.balances['demo-transactional'].data.currentBalance = balance;
    fixture.pendingTransactions.data.transactions = [
      ...pending.map(amount => ({ ...pendingRow, amount })),
      { ...pendingRow, type: 'CREDIT', amount: 50 },
    ];
    fixture.reserve = reserve;
    const file = `interest-${name.replace(/\W+/g, '-')}.json`;
    await writeFile(join(directory, file), JSON.stringify(fixture));
    const downloaded = parseInterestOutput(run(directory, ['interest-maximiser.mjs', file]));
    const browserPending = pendingDebitsMinor(fixture.pendingTransactions.data.transactions);
    const loan = fixture.balances['demo-loan'].data.currentBalance;
    const preview = computeTransferPreview(balance, browserPending / 100, reserve, loan);
    assert.deepEqual(downloaded, {
      pendingMinor: browserPending,
      transferableMinor: decimalToMinor(preview.transferable),
      sourceAfterMinor: decimalToMinor(preview.sourceAfter),
      targetAfterMinor: decimalToMinor(preview.targetAfter),
    }, name);
  }
  assert.equal(interestDefaultPending, 2315.4);
});

function runAllowingExitCode(directory: string, args: string[]) {
  const result = spawnSync(process.execPath, args, {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15_000,
    env: { PATH: process.env.PATH ?? '', TEST_FETCH_MODE: 'deny', NODE_OPTIONS: `--import=${guard}` },
  });
  assert.equal(result.error, undefined);
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

test('Payment Pinger: browser previews match the downloaded payment-pinger.mjs', async () => {
  const directory = await extract('payment-pinger');
  const transactions = [
    ...pingerTxns,
    { merchant: '  Spaced Cafe  ', amount: 10, currency: 'GBP', city: '  ', cardLast4: '' },
    { merchant: 'x'.repeat(81), amount: 1, currency: 'ZAR' },
    { merchant: 'Kiosk', amount: 0.005, currency: 'ZAR', cardLast4: 1234 },
    null,
  ];
  await writeFile(join(directory, 'parity.json'), JSON.stringify({ transactions }));
  for (const [file, rows] of [['./payment-pinger-mock-data.json', pingerTxns], ['parity.json', transactions]] as const) {
    const { stdout, status } = runAllowingExitCode(directory, ['payment-pinger.mjs', file]);
    const expected = ['MOCK PREVIEW - no Telegram message or email is sent.'];
    let invalid = false;
    rows.forEach((row, i) => {
      const preview = previewPing(row as Parameters<typeof previewPing>[0]);
      expected.push('');
      if (!preview.ok) { invalid = true; expected.push(`#${i} INVALID: ${preview.errors.join('; ')}`); return; }
      expected.push(`#${i} [telegram preview] ${preview.message}`);
      if (preview.alert) expected.push(`#${i} [email alert preview] ${preview.alert}`);
    });
    assert.equal(stdout, expected.join('\n') + '\n', file);
    assert.equal(status, invalid ? 1 : 0, `${file} exit code reflects invalid rows`);
  }
});

test('Card-To-Sheet-Sync: browser rows, skips and CSV match the downloaded card-to-sheet-sync.mjs', async () => {
  const directory = await extract('card-to-sheet-sync');
  const transactions = [
    ...sheetTxns,
    { date: '2025-02-29', merchant: 'Leap fail', amount: 1, currency: 'ZAR', status: 'approved' },
    { date: '2024-02-29', merchant: ' @SUM(A1) ', category: '+cmd', amount: 1.005, currency: 'ZAR', status: 'approved' },
    { date: '2025-05-01', merchant: 'Line\nbreak, "quoted"', amount: 99.999, currency: 'USD', status: 'approved' },
    { date: '2025-05-02', merchant: 'Pending', amount: 5, currency: 'ZAR', status: 'pending' },
  ];
  await writeFile(join(directory, 'parity.json'), JSON.stringify({ transactions }));
  for (const [file, rows] of [['./card-to-sheet-sync-mock-data.json', sheetTxns], ['parity.json', transactions]] as const) {
    const csv = `${file.replace(/\W+/g, '-')}.csv`;
    const stdout = run(directory, ['card-to-sheet-sync.mjs', file, csv]);
    const browser = buildSheetRows(rows as unknown[]);
    const expected = [
      'MOCK RUN - nothing is sent to Make or Google Sheets.',
      ...browser.rows.map(r => `ROW   ${r.date}  ${r.merchant.slice(0, 32).padEnd(32)} ${r.currency} ${r.amount.toFixed(2)}`),
      ...browser.skipped.map(s => `SKIP  #${s.index} ${s.reason}`),
      `Wrote ${browser.rows.length} formula-safe rows to ${csv}`,
    ];
    assert.equal(stdout, expected.join('\n') + '\n', file);
    assert.equal(await readFile(join(directory, csv), 'utf8'), rowsToCsv(browser.rows), `${file} CSV equals the browser download`);
  }
});

test('Swipe n Save: browser simulation matches the downloaded swipe-n-save.mjs savings and total', async () => {
  const directory = await extract('swipe-n-save');
  const transactions = [
    ...swipeTxns,
    { merchant: 'Rounding', mcc: '5411', amount: 0.05 },
    { merchant: 'Half cent', mcc: '5411', amount: 10.05 },
    { merchant: 'Bad MCC', mcc: '54', amount: 10 },
  ];
  await writeFile(join(directory, 'parity.json'), JSON.stringify({ percent: 10, transactions }));
  const cases: [string, unknown[], number][] = [
    ['./swipe-n-save-mock-data.json', swipeTxns, 10],
    ['./swipe-n-save-mock-data.json', swipeTxns, 2.5],
    ['parity.json', transactions, 10],
    ['parity.json', transactions, 33.333],
    ['parity.json', transactions, 10000],
  ];
  for (const [file, rows, pct] of cases) {
    const { stdout, status } = runAllowingExitCode(directory, ['swipe-n-save.mjs', file, String(pct)]);
    const sim = simulateSwipe(rows, pct);
    assert.ok(sim.ok);
    const lines = stdout.split('\n');
    const downloaded = lines.filter(line => /^(SAVE|SKIP|INVALID) /.test(line)).map(line => {
      const save = /^(SAVE|SKIP) {5}.{28}R\s+(\d+\.\d{2}) {2}(.*)$/.exec(line);
      if (save) return { excluded: save[1] === 'SKIP', saving: Number(save[2]), reason: save[3], ok: true };
      return { ok: false, reason: line.slice(9 + 28) };
    });
    const browser = sim.results.map(({ result }) => result.ok
      ? { excluded: result.excluded, saving: result.saving, reason: result.reason, ok: true }
      : { ok: false, reason: result.reason });
    assert.deepEqual(downloaded, browser, `${file} @ ${pct}%`);
    const totalLine = lines.find(line => /total/i.test(line) && /R\s*\d/.test(line));
    assert.ok(totalLine, `total line missing in:\n${stdout}`);
    assert.match(totalLine, new RegExp(`R\\s*${sim.total.toFixed(2).replace('.', '\\.')}\\b`), `${file} @ ${pct}% total`);
    assert.equal(status, sim.results.some(r => !r.result.ok) ? 1 : 0);
  }
});
