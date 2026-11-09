export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
import { communityKits, DIRECTORY_URL } from './community-kits.ts';
import { learningKits } from './learning-kits.ts';
import { decimalToMinor } from './sample-helpers.mjs';
import { decide, formatRand } from './card-guard-engine.mjs';
import { spendRows } from './spend-explorer-engine.mjs';
import { pendingDebitsMinor, transferPreviewMinor } from './interest-maximiser-engine.mjs';
import { cardGuardEngineSource, interestMaximiserEngineSource, spendExplorerEngineSource } from './kit-engine-sources.ts';
import type { SourceReview } from './source-review.ts';
import { apiDownloadNote } from './official-api.ts';
import type { KitSlug } from './kit-slugs.ts';
import type { AccountTransaction } from './learning-engines.mjs';

export type Category = 'Savings' | 'Insights' | 'Card controls' | 'Notifications' | 'Accounting';

export interface Kit {
  slug: KitSlug;
  name: string;
  tagline: string;
  summary: string;
  category: Category;
  language: 'JavaScript';
  difficulty: Difficulty;
  minutes: number;
  origin: 'community' | 'illustrative';
  usesInvestecApi?: boolean;
  credit?: {
    sourceReview: SourceReview;
    authors: { name: string; handle?: string; url?: string }[];
    links: { label: string; url: string }[];
    acknowledgements?: string[];
    licence?: string;
    upstream: string;
    adaptation: string;
  };
  scriptFile: string;
  dataFile: string;
  script: string;
  mockData: unknown;
  additionalFiles?: Record<string, string>;
  additionalReadme?: string;
  setup: { title: string; body: string; code?: string }[];
  limitations: string[];
  checklist: { id: string; label: string }[];
  addedOrder: number;
}

export const interestFixture = {
  accounts: {
    data: {
      accounts: [
        { accountId: 'demo-transactional', accountNumber: '00000001', accountName: 'Private Bank Account', referenceName: 'Transactional', productName: 'Private Bank Account', kycCompliant: true, profileId: 'demo-profile', profileName: 'Demo profile' },
        { accountId: 'demo-loan', accountNumber: '00000002', accountName: 'Home Loan', referenceName: 'Loan', productName: 'Home Loan', kycCompliant: true, profileId: 'demo-profile', profileName: 'Demo profile' },
      ],
    },
    links: { self: '/za/pb/v1/accounts' },
    meta: { totalPages: 1 },
  },
  balances: {
    'demo-transactional': {
      data: { accountId: 'demo-transactional', currentBalance: 18450.75, availableBalance: 16135.35, budgetBalance: 0, straightBalance: 18450.75, cashBalance: 0, currency: 'ZAR' },
      links: { self: '/za/pb/v1/accounts/demo-transactional/balance' },
      meta: { totalPages: 1 },
    },
    'demo-loan': {
      data: { accountId: 'demo-loan', currentBalance: -1284330.12, availableBalance: -1284330.12, budgetBalance: 0, straightBalance: -1284330.12, cashBalance: 0, currency: 'ZAR' },
      links: { self: '/za/pb/v1/accounts/demo-loan/balance' },
      meta: { totalPages: 1 },
    },
  },
  pendingTransactions: {
    data: {
      transactions: [{
        accountId: 'demo-transactional',
        type: 'DEBIT',
        status: 'PENDING',
        description: 'Demo pending card purchase',
        transactionDate: '2026-11-03',
        amount: 2315.4,
      }],
    },
    links: { self: '/za/pb/v1/accounts/demo-transactional/pending-transactions' },
    meta: { totalPages: 1 },
  },
  sourceAccountId: 'demo-transactional',
  targetAccountId: 'demo-loan',
  reserve: 5000,
};

const interestScript = `// Interest Maximiser uses official account and pending-transaction response envelopes.
// The engine below is the same code the Launchpad browser demo runs.
${interestMaximiserEngineSource}
import { readFileSync } from 'node:fs';
import { createSampleData } from './sample-helpers.mjs';

const fmt = value => {
  const negative = value < 0;
  const absolute = Math.abs(value);
  return (negative ? '-R ' : 'R ') + Math.floor(absolute / 100).toLocaleString('en-ZA') + '.' + String(absolute % 100).padStart(2, '0');
};

async function main() {
  const data = JSON.parse(readFileSync(process.argv[2] || './interest-maximiser-mock-data.json', 'utf8'));
  const client = createSampleData(data);
  const accounts = (await client.listAccounts()).data.accounts;
  const sourceId = data.sourceAccountId;
  const targetId = data.targetAccountId;
  if (!accounts.some(account => account.accountId === sourceId) || !accounts.some(account => account.accountId === targetId)) {
    throw new Error('Selected account ID is not present in the accounts response.');
  }
  const [source, target, pending] = await Promise.all([
    client.getBalance(sourceId), client.getBalance(targetId), client.getPendingTransactions(sourceId),
  ]);
  if (source.data.currency !== target.data.currency) throw new Error('Source and target accounts must use the same currency.');
  const balance = decimalToMinor(source.data.currentBalance);
  const pendingMinor = pendingDebitsMinor(pending.data.transactions);
  const reserve = decimalToMinor(data.reserve);
  const targetBalance = decimalToMinor(target.data.currentBalance);
  const { transferableMinor: transferable, sourceAfterMinor, targetAfterMinor } = transferPreviewMinor({
    balanceMinor: balance, pendingMinor, reserveMinor: reserve, targetBalanceMinor: targetBalance,
  });
  console.log('MOCK PREVIEW - no transfer is sent.');
  console.log('Source balance:          ' + fmt(balance));
  console.log('Pending debits held back:' + fmt(pendingMinor));
  console.log('Reserve held back:       ' + fmt(reserve));
  console.log('Transferable estimate:   ' + fmt(transferable));
  console.log('');
  console.log('Before -> ' + source.data.accountId + ': ' + fmt(balance) + ' | ' + target.data.accountId + ': ' + fmt(targetBalance));
  console.log('After  -> ' + source.data.accountId + ': ' + fmt(sourceAfterMinor) + ' | ' + target.data.accountId + ': ' + fmt(targetAfterMinor));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Kit run failed.');
  process.exitCode = 1;
});
`;

export const spendTransactionEnvelope = {
  data: {
    transactions: [
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Woolies Food Rosebank', postingDate: '2025-03-01', valueDate: '2025-03-01', transactionDate: '2025-03-01', amount: 842.35, uuid: 't1' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Gautrain Sandton', postingDate: '2025-03-02', valueDate: '2025-03-02', transactionDate: '2025-03-02', amount: 74, uuid: 't2' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Bean There Coffee', postingDate: '2025-03-03', valueDate: '2025-03-03', transactionDate: '2025-03-03', amount: 46.5, uuid: 't3' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'City Power prepaid', postingDate: '2025-03-04', valueDate: '2025-03-04', transactionDate: '2025-03-04', amount: 600, uuid: 't4' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Checkers Sixty60', postingDate: '2025-03-05', valueDate: '2025-03-05', transactionDate: '2025-03-05', amount: 517.89, uuid: 't5' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Bolt trip Braamfontein', postingDate: '2025-03-06', valueDate: '2025-03-06', transactionDate: '2025-03-06', amount: 63.2, uuid: 't6' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Kauai Melrose Arch', postingDate: '2025-03-07', valueDate: '2025-03-07', transactionDate: '2025-03-07', amount: 112, uuid: 't7' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Showmax subscription', postingDate: '2025-03-08', valueDate: '2025-03-08', transactionDate: '2025-03-08', amount: 99, uuid: 't8' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Engen Jan Smuts', postingDate: '2025-03-09', valueDate: '2025-03-09', transactionDate: '2025-03-09', amount: 950.4, uuid: 't9' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'POSTED', description: 'Spotify Family', postingDate: '2025-03-10', valueDate: '2025-03-10', transactionDate: '2025-03-10', amount: 119.99, uuid: 't10' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'PENDING', description: 'Pick n Pay Parkhurst', transactionDate: '2025-03-11', amount: 388.6, uuid: 't11' },
      { accountId: 'demo-spend', type: 'DEBIT', status: 'PENDING', description: 'Nandos Greenside', transactionDate: '2025-03-12', amount: 231.5, uuid: 't12' },
    ],
  },
  links: { self: '/za/pb/v1/accounts/demo-spend/transactions' },
  meta: { totalPages: 1 },
};

// Browser rows come from the same engine the downloaded spend-explorer.mjs embeds.
export const spendTransactions = spendRows(spendTransactionEnvelope.data.transactions as AccountTransaction[]);

const spendScript = `// Spend Explorer reads official account transaction response envelopes.
// The engine below is the same code the Launchpad browser demo runs.
${spendExplorerEngineSource}
import { readFileSync } from 'node:fs';
import { createSampleData } from './sample-helpers.mjs';

async function main() {
  const data = JSON.parse(readFileSync(process.argv[2] || './spend-explorer-mock-data.json', 'utf8'));
  const client = createSampleData(data);
  const accountId = data.accountId;
  const envelope = await client.getTransactions(accountId, { includePending: true });
  const wantedCategory = (process.argv[3] || 'all').toLowerCase();
  const search = (process.argv[4] || '').toLowerCase();
  const rows = filterSpendRows(spendRows(envelope.data.transactions), { category: wantedCategory, search });
  console.log('TRANSACTIONS - categories are derived from description.');
  for (const row of rows) {
    console.log(row.date + '  ' + row.description.padEnd(28) + ' R ' + (row.amountMinor / 100).toFixed(2).padStart(9) + '  ' + row.status);
  }
  console.log('\\nPosted debit totals by category:');
  for (const [name, cents] of postedDebitTotalsMinor(rows)) {
    console.log('  ' + name.padEnd(14) + ' R ' + (cents / 100).toFixed(2));
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Kit run failed.');
  process.exitCode = 1;
});
`;

const cardScript = `// Card Guard starter (Launchpad illustrative example kit)
// Not related to the community Card Guard project by CSTech.
// Simulates an approve/decline decision on a mock purchase. No bank or card connection.
// Run: node card-guard.mjs [mock-data.json]
// Rules live in card-rules.mjs, the same engine the Launchpad browser demo runs.
import { readFileSync } from 'node:fs';
import { decide, formatRand } from './card-rules.mjs';

const file = process.argv[2] || './card-guard-mock-data.json';
const { rules, purchases } = JSON.parse(readFileSync(file, 'utf8'));

console.log('MOCK SIMULATION - no card is charged or blocked.');
for (const p of purchases) {
  const d = decide(p, rules);
  console.log((d.approved ? 'APPROVE' : 'DECLINE') + '  ' + p.merchant.padEnd(22) + ' ' + formatRand(p.amount).padStart(13) + '  ' + d.reason);
}
`;

const cardCodeScript = `// Card Guard card-code sample (fictional rule values; no card or bank connection).
// Hook names follow the official Card API code template. Fields read below appear in the
// authorization logged by the official POST /za/v1/cards/{cardKey}/code/execute example.
// beforeTransaction returns true to approve or false to decline, and has a limited
// execution time, so keep it short-running.
const spendLimitCents = 150000; // R1,500.00; amounts are in cents.
const blockedCategoryCodes = ['7995']; // Illustrative code; look up codes with GET /za/v1/cards/merchants.

const beforeTransaction = async (authorization) => {
  if (!Number.isFinite(authorization.centsAmount) || authorization.centsAmount <= 0) return false;
  if (blockedCategoryCodes.includes(authorization.merchant.category.code)) return false;
  return authorization.centsAmount <= spendLimitCents;
};

// The official simulation example logs the same fields for afterTransaction.
const afterTransaction = async (transaction) => {
  console.log('afterTransaction: ' + transaction.merchant.name + ' ' + transaction.centsAmount + ' cents');
};

// Runs when a transaction is declined. Its argument fields are not documented, so none are read.
const afterDecline = async (transaction) => {
  console.log('afterDecline: transaction declined');
};
`;

const cardCodeHarnessScript = `import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { decide, formatRand } from './card-rules.mjs';

const localTimeoutMs = 1000;
const vmTimeoutMs = 100;
export const hookNames = ['beforeTransaction', 'afterTransaction', 'afterDecline'];
const exportHooks = hookNames
  .map(name => name + ': typeof ' + name + " === 'function' ? " + name + ' : undefined')
  .join(', ');
const vmRunner = \`import { readFileSync } from 'node:fs';
import { createContext, runInNewContext } from 'node:vm';

const input = JSON.parse(readFileSync(0, 'utf8'));
try {
  const hookLogs = [];
  const context = createContext({
    console: { log: (...values) => hookLogs.push(values) },
  }, { microtaskMode: 'afterEvaluate' });
  runInNewContext(input.source, context, { timeout: input.vmTimeoutMs });
  if (typeof context.__sampleHooks[input.hook] !== 'function') {
    process.stdout.write(JSON.stringify({ defined: false, hookLogs }));
  } else {
    context.__argument = input.argument;
    runInNewContext(
      'Promise.resolve(__sampleHooks[' + JSON.stringify(input.hook) + '](__argument)).then(' +
        'value => { globalThis.__settled = true; globalThis.__value = value; }, ' +
        'error => { globalThis.__settled = true; globalThis.__hookError = String(error); })',
      context,
      { timeout: input.vmTimeoutMs },
    );
    if (!context.__settled) await new Promise(resolve => setTimeout(resolve, input.vmTimeoutMs));
    if (!context.__settled) throw new Error('Local sample execution timed out.');
    if (context.__hookError) throw new Error(context.__hookError);
    process.stdout.write(JSON.stringify({ defined: true, value: context.__value, hookLogs }));
  }
} catch (error) {
  process.stdout.write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
}
\`;

export async function runHook(source, hook, argument) {
  try {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', vmRunner], {
      input: JSON.stringify({
        source: source + '\\n;globalThis.__sampleHooks = { ' + exportHooks + ' };',
        hook,
        argument,
        vmTimeoutMs,
      }),
      encoding: 'utf8',
      timeout: localTimeoutMs,
    });
    const result = JSON.parse(output);
    if (result.error) throw new Error(result.error);
    return result;
  } catch (error) {
    if (error?.code === 'ETIMEDOUT') throw new Error('Local sample execution timed out.', { cause: error });
    if (error?.message) throw error;
    throw new Error(String(error), { cause: error });
  }
}

export async function runBeforeTransaction(source, authorization) {
  const result = await runHook(source, 'beforeTransaction', authorization);
  if (!result.defined) throw new Error('card-code/main.js must define beforeTransaction.');
  return result;
}

// Documented: true approves and false declines; afterDecline runs for a declined transaction.
// Not documented: other return values, and whether afterTransaction also runs after a decline.
export async function simulateAuthorization(source, authorization) {
  const before = await runBeforeTransaction(source, authorization);
  if (typeof before.value !== 'boolean') return { approved: null, before, afterHook: null, after: null };
  const afterHook = before.value ? 'afterTransaction' : 'afterDecline';
  const after = await runHook(source, afterHook, authorization);
  return { approved: before.value, before, afterHook, after };
}

const formatLog = values => values.map(value => (typeof value === 'string' ? value : JSON.stringify(value))).join(' ');

async function main() {
  const fixture = JSON.parse(readFileSync('./fixtures/authorizations/fictional-authorizations.json', 'utf8'));
  const sample = readFileSync('./card-code/main.js', 'utf8');
  const { rules, purchases } = JSON.parse(readFileSync('./card-guard-mock-data.json', 'utf8'));

  console.log('LOCAL TEACHING MODEL — not an Investec IDE replica.');
  console.log('Fictional authorizations use the field names logged in the official Card API simulation example; all values are invented.');
  console.log('beforeTransaction: true approves, false declines (documented). Approved -> afterTransaction; declined -> afterDecline.');
  for (const authorization of fixture.authorizations) {
    const result = await simulateAuthorization(sample, authorization);
    const label = result.approved === true ? 'APPROVE' : result.approved === false ? 'DECLINE' : 'UNKNOWN';
    const dispatch = result.afterHook
      ? (result.after.defined ? 'ran ' : 'not defined: ') + result.afterHook
      : 'non-boolean return; platform outcome not documented';
    console.log(
      '[card code] ' + label + '  ' + authorization.merchant.name.padEnd(22) + ' ' +
      formatRand(authorization.centsAmount / 100).padStart(13) + '  returned ' + JSON.stringify(result.before.value) + '; ' + dispatch,
    );
    for (const values of [...result.before.hookLogs, ...(result.after?.hookLogs ?? [])]) {
      console.log('  [hook log] ' + formatLog(values));
    }
  }
  console.log('The separate local rules engine (card-guard.mjs, using card-rules.mjs) for comparison:');
  for (const purchase of purchases) {
    const result = decide(purchase, rules);
    console.log(
      '[local rules] ' + (result.approved ? 'APPROVE' : 'DECLINE') + '  ' +
      purchase.merchant.padEnd(22) + ' ' + formatRand(purchase.amount).padStart(13) + '  ' + result.reason,
    );
  }
  console.log('Not documented, so not simulated: afterDecline argument fields, whether afterTransaction also runs after a decline, the platform time limit, and timeout/exception outcomes.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
`;

const fictionalCategories: Record<string, { code: string; key: string; name: string }> = {
  'Online retail': { code: '5999', key: 'miscellaneous_specialty_retail', name: 'Miscellaneous Specialty Retail' },
  Fuel: { code: '5541', key: 'service_stations', name: 'Service Stations' },
  Gambling: { code: '7995', key: 'betting_casino_gambling', name: 'Betting/Casino Gambling' },
  Groceries: { code: '5411', key: 'grocery_stores_supermarkets', name: 'Grocery Stores, Supermarkets' },
};

const fictionalAuthorization = (
  index: number,
  merchant: string,
  category: string,
  centsAmount: number,
  city: string,
) => ({
  accountNumber: '10000000001',
  dateTime: `2026-01-15T${String(index + 8).padStart(2, '0')}:00:00.000Z`,
  centsAmount,
  currencyCode: 'zar',
  type: 'card',
  reference: 'local-fixture',
  card: { id: '9000001' },
  merchant: {
    category: fictionalCategories[category],
    name: merchant,
    city,
    country: { code: 'ZA', alpha3: 'ZAF', name: 'South Africa' },
  },
});

const cardCodeFixture = {
  provenance:
    'Fictional Launchpad fixture. Field names and value types follow the authorization logged by console.log(authorization) in the official Card API POST /za/v1/cards/{cardKey}/code/execute 200 example; every value is invented. Merchant category codes, keys and names are illustrative, not verified Investec reference data. The complete authorization field list is not documented.',
  sourcePointer:
    '/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/responses/200/content/application~1json/example/data/result/0/logs/0/content',
  authorizations: [
    fictionalAuthorization(0, 'Takealot', 'Online retail', 89900, 'Cape Town'),
    fictionalAuthorization(1, 'Sasol Rivonia', 'Fuel', 172055, 'Johannesburg'),
    fictionalAuthorization(2, 'Lucky Spin Online', 'Gambling', 20000, 'Cape Town'),
    fictionalAuthorization(3, 'Spar Kloof Street', 'Groceries', 34210, 'Cape Town'),
  ],
};

const cardCodeReadme = `# Card-code hook sample

\`main.js\` uses the hook names from the official Card API code template and reads only fields that appear in the authorization logged by the official simulation example: \`centsAmount\`, \`merchant.category.code\` and \`merchant.name\`. \`beforeTransaction\` returns \`true\` to approve or \`false\` to decline. The spend limit and blocked category code are fictional sample values.

From the Card Guard package root, run \`node simulate-card-code.mjs\`. That bounded offline teaching model is not an Investec IDE replica. For each fictional authorization it calls \`beforeTransaction\`, treats \`true\` as approve and \`false\` as decline, then calls \`afterTransaction\` (approved) or \`afterDecline\` (declined). It prints the separate local rules engine's decisions for comparison.

\`fixtures/authorizations/fictional-authorizations.json\` uses the documented field names and types with invented values. Merchant category codes, keys and names are illustrative; look up real codes with GET \`/za/v1/cards/merchants\`.

Sources (retrieved 2026-11-06):
- [Published API baseline](https://github.com/Investec-Developer-Community/investec-developer-starter-kits/blob/main/scripts/official-api-baseline.json) and [official Card API reference](https://developer.investec.com/api-reference/SA%20Card%20Code):
  - code template: \`/paths/~1za~1v1~1cards~1{cardKey}~1code/get/responses/200/content/application~1json/example/data/result/code\`
  - simulation request example: \`/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/requestBody/content/application~1json/schema/example\`
  - logged authorization: \`/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/responses/200/content/application~1json/example/data/result/0/logs/0/content\`
- Investec Developer Community wiki, [How to add code to your card](https://github.com/Investec-Developer-Community/community-wiki/blob/ef8301c86771bd067792f7a94bd0f4bf1cbdc47a/get-started/card-quick-start-guide/how-to-add-code-to-your-card.md): return true/false, limited time, afterTransaction/afterDecline triggers.

Not documented, so not simulated: the complete authorization field list, the \`afterDecline\` argument fields, non-boolean return outcomes, whether \`afterTransaction\` also runs after a decline, the platform time limit, timeout/exception outcomes, and how environment variables are read in code. The local VM deadline is a harness bound, not an Investec timing policy.
`;

export const merchantCategories = ['Groceries', 'Fuel', 'Gambling', 'Online retail', 'Restaurants', 'Travel'];

export const kits: Kit[] = [
  {
    slug: 'interest-maximiser',
    name: 'Interest Maximiser',
    tagline: 'Park spare cash against debt, keep a safety reserve.',
    summary:
      'Calculates how much of a transactional balance could be moved toward a loan account after holding back pending transactions and a reserve. Community-inspired by the approach Frikkie Snyman shared with the programmable banking community.',
    category: 'Savings',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    minutes: 25,
    origin: 'community',
    credit: {
      sourceReview: {
        checkedOn: null,
        repositoryUrl: 'https://github.com/FrikkieSnyman/investec-tools',
        readmeUrl: 'https://api.github.com/repos/FrikkieSnyman/investec-tools/readme',
        licenceUrl: 'https://api.github.com/repos/FrikkieSnyman/investec-tools/license',
        licenceSha256: null,
      },
      authors: [{ name: 'Frikkie Snyman', url: 'https://github.com/FrikkieSnyman' }],
      links: [
        { label: 'FrikkieSnyman/investec-tools', url: 'https://github.com/FrikkieSnyman/investec-tools' },
        { label: 'OfferZen community article', url: 'https://www.offerzen.com/blog/programmable-banking-community-how-to-save-on-interest-when-paying-off-debt' },
        { label: 'Community Projects directory', url: DIRECTORY_URL },
      ],
      upstream: 'Community tooling and article describing moving spare transactional cash against a loan to save interest.',
      adaptation: 'Launchpad-authored calculator on mock balances. No upstream code is copied and nothing is transferred.',
    },
    scriptFile: 'interest-maximiser.mjs',
    dataFile: 'interest-maximiser-mock-data.json',
    script: interestScript,
    usesInvestecApi: true,
    mockData: interestFixture,
    setup: [
      { title: 'Check Node', body: 'Requires Node.js 20.12 or newer. Mock mode needs no packages or credentials.', code: 'node --version' },
      { title: 'Extract the starter', body: 'Download the ZIP, extract it, then cd interest-maximiser.' },
      { title: 'Run against mock data', body: 'The script reads the JSON, validates inputs and prints before/after balances. Nothing is transferred.', code: 'node interest-maximiser.mjs ./interest-maximiser-mock-data.json' },
      { title: 'Experiment', body: 'Edit the reserve in the JSON and rerun. Try a negative reserve to see validation fail.', code: 'node interest-maximiser.mjs' },
      { title: 'Read the original', body: 'Compare with the community source repo and article before writing anything that talks to a real API.' },
    ],
    limitations: [
      'Pending amounts can change or disappear before posting. The estimate uses the documented pending-transactions response and is not an available-balance guarantee.',
      'The original community repo was written against an earlier version of the programmable banking APIs and tooling. Endpoints, auth flows and dependencies may no longer match; treat it as a reference, not a drop-in.',
      'No real transfer logic, scheduling, retries, idempotency or cut-off-time handling is included.',
      'Interest savings depend on your actual loan terms. This kit does not calculate interest.',
      'Not production-ready banking logic. Do not point it at real accounts without your own review.',
    ],
    checklist: [
      { id: 'node', label: 'Confirmed Node 20.12+ is installed' },
      { id: 'download', label: 'Downloaded the script and mock data' },
      { id: 'run', label: 'Ran the script against mock data' },
      { id: 'edit', label: 'Changed the reserve and observed the result' },
      { id: 'read', label: 'Read the original repo and article' },
      { id: 'limits', label: 'Reviewed the known limitations' },
    ],
    addedOrder: 1,
  },
  {
    slug: 'spend-explorer',
    name: 'Spend Explorer',
    tagline: 'Filter fictional transactions, total them by category.',
    summary:
      'A new illustrative example kit created for Launchpad. Filters a bundled list of fictional rand transactions by category and description, then sums posted amounts per category. A gentle first project for reading transaction-shaped data.',
    category: 'Insights',
    language: 'JavaScript',
    difficulty: 'Beginner',
    minutes: 15,
    origin: 'illustrative',
    usesInvestecApi: true,
    scriptFile: 'spend-explorer.mjs',
    dataFile: 'spend-explorer-mock-data.json',
    script: spendScript,
    mockData: {
      accountId: 'demo-spend',
      accounts: {
        data: {
          accounts: [
            { accountId: 'demo-spend', accountNumber: '00000003', accountName: 'Private Bank Account', referenceName: 'Spend Explorer', productName: 'Private Bank Account', kycCompliant: true, profileId: 'demo-profile', profileName: 'Demo profile' },
          ],
        },
        links: { self: '/za/pb/v1/accounts' },
        meta: { totalPages: 1 },
      },
      transactions: spendTransactionEnvelope,
    },
    setup: [
      { title: 'Check Node', body: 'Requires Node.js 20.12 or newer. Mock mode needs no packages or credentials.', code: 'node --version' },
      { title: 'Extract the starter', body: 'Download the ZIP, extract it, then cd spend-explorer.' },
      { title: 'Run everything', body: 'Lists all transactions and posted totals per category.', code: 'node spend-explorer.mjs ./spend-explorer-mock-data.json' },
      { title: 'Filter', body: 'Pass a category and optional search text.', code: 'node spend-explorer.mjs ./spend-explorer-mock-data.json transport bolt' },
      { title: 'Extend', body: 'Add your own fictional rows to the JSON, or a month filter, and rerun.' },
    ],
    limitations: [
      'Pending transactions are listed but excluded from totals. Real pending items can change amount or disappear before posting.',
      'Categories are derived locally from description text; Investec does not supply these categories in the transaction response.',
      'No currency conversion, refunds or reversals are modelled.',
      'This is an illustrative example kit, not derived from any hackathon project, and has no source repository.',
      'Not production-ready; intended for learning on fictional data.',
    ],
    checklist: [
      { id: 'download', label: 'Downloaded the script and mock data' },
      { id: 'run', label: 'Ran the script with no filters' },
      { id: 'filter', label: 'Ran with a category filter' },
      { id: 'extend', label: 'Added a fictional transaction of my own' },
      { id: 'limits', label: 'Reviewed the known limitations' },
    ],
    addedOrder: 2,
  },
  {
    slug: 'card-guard',
    name: 'Card Guard',
    tagline: 'Apply your rules to fictional card purchases.',
    summary:
      'A new illustrative example kit created for Launchpad. Applies a spend limit and a merchant-category restriction to simulated card purchases and explains each approve or decline decision. A local teaching model for thinking about card rules.',
    category: 'Card controls',
    language: 'JavaScript',
    difficulty: 'Advanced',
    minutes: 30,
    origin: 'illustrative',
    scriptFile: 'card-guard.mjs',
    dataFile: 'card-guard-mock-data.json',
    script: cardScript,
    mockData: {
      note: 'Fictional rules and purchases for local experimentation only.',
      rules: { spendLimit: 1500, blockedCategories: ['Gambling'] },
      purchases: [
        { merchant: 'Takealot', merchantCategory: 'Online retail', amount: 899.0 },
        { merchant: 'Sasol Rivonia', merchantCategory: 'Fuel', amount: 1720.55 },
        { merchant: 'Lucky Spin Online', merchantCategory: 'Gambling', amount: 200.0 },
        { merchant: 'Spar Kloof Street', merchantCategory: 'Groceries', amount: 342.1 },
      ],
    },
    additionalFiles: {
      'card-rules.mjs': cardGuardEngineSource,
      'card-code/main.js': cardCodeScript,
      'card-code/README.md': cardCodeReadme,
      'simulate-card-code.mjs': cardCodeHarnessScript,
      'fixtures/authorizations/fictional-authorizations.json': JSON.stringify(cardCodeFixture, null, 2),
    },
    additionalReadme: [
      '## Offline card-code teaching model',
      'Run `node simulate-card-code.mjs` to run `card-code/main.js` in a bounded local Node VM against fictional authorizations. This is not an Investec IDE replica. As documented, `beforeTransaction(authorization)` returns `true` to approve or `false` to decline; the harness then calls `afterTransaction(transaction)` for an approval or `afterDecline(transaction)` for a decline, and prints the separate local rules engine decisions for comparison.',
      'The sample reads only `centsAmount`, `merchant.category.code` and `merchant.name`. `fixtures/authorizations/fictional-authorizations.json` uses the field names and types of the authorization logged in the official simulation example (`accountNumber`, `dateTime`, `centsAmount` in cents, `currencyCode`, `type`, `reference`, `card.id`, `merchant.category.code/key/name`, `merchant.name`, `merchant.city`, `merchant.country.code/alpha3/name`); every value is invented, and category codes, keys and names are illustrative.',
      'The `/code/execute` request example uses different, flat request fields (`simulationcode`, `centsAmount` as a string, `currencyCode`, `merchantCode`, `merchantName`, `merchantCity`, `countryCode`); the hook receives the nested authorization object instead.',
      'Provenance in the [published API baseline](https://github.com/Investec-Developer-Community/investec-developer-starter-kits/blob/main/scripts/official-api-baseline.json): code template at `/paths/~1za~1v1~1cards~1{cardKey}~1code/get/responses/200/content/application~1json/example/data/result/code`; simulation request at `/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/requestBody/content/application~1json/schema/example`; logged authorization at `/paths/~1za~1v1~1cards~1{cardKey}~1code~1execute/post/responses/200/content/application~1json/example/data/result/0/logs/0/content`. Return semantics and hook triggers: [Investec Developer Community wiki, How to add code to your card](https://github.com/Investec-Developer-Community/community-wiki/blob/ef8301c86771bd067792f7a94bd0f4bf1cbdc47a/get-started/card-quick-start-guide/how-to-add-code-to-your-card.md).',
      'Not documented, so not simulated: the complete authorization field list, `afterDecline` argument fields, non-boolean return outcomes, whether `afterTransaction` also runs after a decline, the platform time limit (documented only as limited), timeout/exception outcomes and how environment variables are read in code. The VM and helper-process timeouts are local harness bounds only. Real-card behavior and deployment are not implemented or claimed.',
    ].join('\n\n'),
    setup: [
      { title: 'Check Node', body: 'Requires Node.js 20.12 or newer. No dependencies.', code: 'node --version' },
      { title: 'Extract the starter', body: 'Download the ZIP, extract it, then cd card-guard.' },
      { title: 'Simulate', body: 'Evaluates each mock purchase and prints the decision with a reason.', code: 'node card-guard.mjs ./card-guard-mock-data.json' },
      { title: 'Try the card-code teaching model', body: 'Runs the sample hooks on fictional authorizations shaped like the documented example: true approves and runs afterTransaction, false declines and runs afterDecline. It does not simulate Investec IDE behavior.', code: 'node simulate-card-code.mjs' },
      { title: 'Tune the rules', body: 'Change spendLimit or blockedCategories in the JSON and rerun to see decisions flip.' },
      { title: 'Think about failure', body: 'Before any real use, decide what should happen if your rule code is slow or crashes. This kit does not answer that.' },
    ],
    limitations: [
      'Decisions are simulated locally. Authorization field names come from one logged official example; the complete field list, afterDecline argument fields and platform time limit are not documented.',
      'Pending and previously authorised spend is not counted toward the limit; a real daily limit would need it.',
      'Merchant categories are plain strings in mock data, not real merchant category codes.',
      'This is an illustrative example kit, not derived from any hackathon project, and has no source repository. Previously named Card Guard here; it is unrelated to the community Card Guard project by CSTech.',
      'Not production-ready; a bug in real card rules could decline legitimate purchases.',
    ],
    checklist: [
      { id: 'download', label: 'Downloaded the script and mock data' },
      { id: 'run', label: 'Ran the simulation' },
      { id: 'limit', label: 'Changed the spend limit and reran' },
      { id: 'block', label: 'Added a blocked category and reran' },
      { id: 'limits', label: 'Reviewed the known limitations' },
    ],
    addedOrder: 3,
  },
  ...communityKits,
].map(kit => ({
  ...kit,
  script: apiDownloadNote(kit.slug) + kit.script,
  setup: kit.setup.map(step => step.title === 'Make a folder'
    ? { title: 'Extract the starter', body: `Download the ZIP, extract it, then cd ${kit.slug}.` }
    : step.title === 'Check Node'
      ? { ...step, body: 'Requires Node.js 20.12 or newer. Mock mode needs no packages or credentials.' }
      : step),
  checklist: kit.checklist.map(item => item.label.includes('Node 18')
    ? { ...item, label: item.label.replace('Node 18+', 'Node 20.12+') }
    : item),
})) as Kit[];

// Preserve existing kit order and routes; new teaching examples extend the catalogue.
kits.push(...learningKits);
export const getKit = (slug: string) => kits.find((k) => k.slug === slug);

// Shared demo logic, mirrors downloadable scripts
// Browser adapter: rand inputs in, rand outputs out; the arithmetic is the shared minor-unit engine.
export function computeTransferPreview(balance: number, pending: number, reserve: number, targetBalance = 0) {
  const preview = transferPreviewMinor({
    balanceMinor: decimalToMinor(balance),
    pendingMinor: decimalToMinor(pending),
    reserveMinor: decimalToMinor(reserve),
    targetBalanceMinor: decimalToMinor(targetBalance),
  });
  return {
    transferable: preview.transferableMinor / 100,
    sourceAfter: preview.sourceAfterMinor / 100,
    targetAfter: preview.targetAfterMinor / 100,
  };
}

export const interestDefaultPending = pendingDebitsMinor(interestFixture.pendingTransactions.data.transactions) / 100;

// Card Guard's browser demo and downloaded card-rules.mjs share card-guard-engine.mjs.
export const decidePurchase = decide;

// en-ZA rand amounts ("R 1 500,00") from the shared Card Guard formatter, independent of host locale data.
export const zar = formatRand;
