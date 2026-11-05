import type { Kit } from './kits';
import { pingerLogic, sheetLogic, swipeLogic } from './community-logic';

export const DIRECTORY_URL = 'https://github.com/Investec-Developer-Community/Community-Projects';

const mit = (holder: string) => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const comment = (s: string) => s.split('\n').map((l) => (l ? '// ' + l : '//')).join('\n');

const runnerHead = (file: string) => `import { readFileSync } from 'node:fs';

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { console.error('Could not read ' + path + ': ' + e.message); process.exit(1); }
}

const data = loadJson(process.argv[2] || './${file}');`;

// ---------- Payment Pinger ----------
export const pingerTxns = [
  { merchant: 'Woolies Food Rosebank', amount: 312.4, currency: 'ZAR', city: 'Johannesburg', cardLast4: '4821' },
  { merchant: 'Blue Bottle Coffee', amount: 6.5, currency: 'USD', city: 'Oakland', cardLast4: '4821' },
  { merchant: 'Uber Trip', amount: 87.0, currency: 'ZAR', city: 'Cape Town', cardLast4: '4821' },
  { merchant: 'Fnac Paris', amount: 49.99, currency: 'EUR', city: 'Paris', cardLast4: '4821' },
  { merchant: '', amount: -10, currency: 'zar', cardLast4: '12' },
];

const pingerScript = `// Payment Pinger mock starter (Launchpad adaptation)
// Adapted by Launchpad from "card-payment-notifier" by Roberto Aldera (@roberto-aldera):
//   https://github.com/roberto-aldera/card-payment-notifier
// Listed in the Investec Developer Community directory: ${DIRECTORY_URL}
// Upstream acknowledges Russell Knight for inspiration and help.
// The upstream project sends Telegram messages and emails a non-ZAR alert via a Canarytoken.
// THIS MOCK SENDS NOTHING: it only prints previews. No network, no credentials.
// Run: node payment-pinger.mjs [mock-data.json]
//
// The original work is licensed as follows; this notice must be kept:
//
${comment(mit('2024 Roberto Aldera'))}
//
// Launchpad modifications: rewritten as a local, offline preview with input validation.
${pingerLogic}
${runnerHead('payment-pinger-mock-data.json')}
if (!Array.isArray(data.transactions)) { console.error('transactions must be an array'); process.exit(1); }

console.log('MOCK PREVIEW - no Telegram message or email is sent.');
for (const [i, t] of data.transactions.entries()) {
  const p = previewPing(t);
  console.log('');
  if (!p.ok) { console.log('#' + i + ' INVALID: ' + p.errors.join('; ')); process.exitCode = 1; continue; }
  console.log('#' + i + ' [telegram preview] ' + p.message);
  if (p.alert) console.log('#' + i + ' [email alert preview] ' + p.alert);
}
`;

// ---------- Card-To-Sheet-Sync ----------
export const sheetTxns = [
  { date: '2025-04-01', merchant: 'Checkers Hyper Sandton', category: 'Groceries', amount: 1024.6, currency: 'ZAR', status: 'approved' },
  { date: '2025-04-02', merchant: 'Vida e Caffe, Rosebank', category: 'Eating out', amount: 54.0, currency: 'ZAR', status: 'approved' },
  { date: '2025-04-02', merchant: 'Lucky Spin Online', category: 'Entertainment', amount: 300.0, currency: 'ZAR', status: 'declined' },
  { date: '2025-04-03', merchant: '=HYPERLINK("http://example.invalid","claim")', category: 'Suspicious', amount: 12.0, currency: 'ZAR', status: 'approved' },
  { date: '2025-04-04', merchant: 'The "Corner" Deli', category: 'Eating out', amount: 88.5, currency: 'ZAR', status: 'approved' },
  { date: '2025-04-31', merchant: 'Bad date row', category: 'Other', amount: 10, currency: 'ZAR', status: 'approved' },
];

const sheetScript = `// Card-To-Sheet-Sync mock starter (Launchpad independent mock)
// Inspired by "card-to-sheet-sync" by Dominic Santo (@dominicsanto):
//   https://github.com/dominicsanto/card-to-sheet-sync
// Listed in the Investec Developer Community directory: ${DIRECTORY_URL}
// Licence note: the upstream README declares MIT, but no standalone licence file was verified.
// No upstream code is copied here; this is independent Launchpad-authored code.
// Upstream uses card code afterTransaction to post approved transactions to a Make webhook,
// which appends rows to Google Sheets. THIS MOCK only builds rows and writes a local CSV.
// No network, no credentials, no Sheets or Make.
// Run: node card-to-sheet-sync.mjs [mock-data.json] [out.csv]
import { writeFileSync } from 'node:fs';
${sheetLogic}
${runnerHead('card-to-sheet-sync-mock-data.json')}
const out = process.argv[3] || './card-to-sheet-sync.csv';
let result;
try { result = buildSheetRows(data.transactions); } catch (e) { console.error(e.message); process.exit(1); }

console.log('MOCK RUN - nothing is sent to Make or Google Sheets.');
for (const r of result.rows) console.log('ROW   ' + r.date + '  ' + r.merchant.slice(0, 32).padEnd(32) + ' ' + r.currency + ' ' + r.amount.toFixed(2));
for (const s of result.skipped) console.log('SKIP  #' + s.index + ' ' + s.reason);
writeFileSync(out, rowsToCsv(result.rows), 'utf8');
console.log('Wrote ' + result.rows.length + ' formula-safe rows to ' + out);
`;

// ---------- Swipe n Save ----------
export const swipeTxns = [
  { merchant: 'Pick n Pay Parkhurst', mcc: '5411', amount: 456.3 },
  { merchant: 'Standard ATM Braamfontein', mcc: '6011', amount: 1000.0 },
  { merchant: 'Engen Jan Smuts', mcc: '5541', amount: 820.15 },
  { merchant: 'Kauai Melrose Arch', mcc: '5814', amount: 97.5 },
  { merchant: 'Takealot', mcc: '5999', amount: 1349.0 },
];

const swipeScript = `// Swipe n Save mock starter (Launchpad adaptation)
// Adapted by Launchpad from "investec-swipe-n-save" by Peter Smythe (@petersmythe):
//   https://github.com/petersmythe/investec-swipe-n-save
// Listed in the Investec Developer Community directory: ${DIRECTORY_URL}
// Upstream runs in the card code IDE and transfers a percentage of each purchase to savings,
// needing accounts and transfers OAuth scopes. THIS MOCK only calculates: no credentials,
// no transfers, no network. ATM withdrawals (MCC 6011) are excluded, as upstream.
// Run: node swipe-n-save.mjs [mock-data.json] [percent 1-10000]
//
// The original work is licensed as follows; this notice must be kept:
//
${comment(mit('2024 Peter Smythe'))}
//
// Launchpad modifications: rewritten as a local, offline simulation with input validation.
${swipeLogic}
${runnerHead('swipe-n-save-mock-data.json')}
const pct = process.argv[3] !== undefined ? Number(process.argv[3]) : data.percent;
const sim = simulateSwipe(data.transactions, pct);
if (!sim.ok) { console.error('INVALID: ' + sim.error); process.exit(1); }

console.log('MOCK SIMULATION at ' + pct + '% - no money moves.');
for (const r of sim.results) {
  const t = r.result;
  const name = String(r.txn && r.txn.merchant || '?').padEnd(28);
  if (!t.ok) { console.log('INVALID  ' + name + t.reason); process.exitCode = 1; continue; }
  console.log((t.excluded ? 'SKIP     ' : 'SAVE     ') + name + 'R ' + t.saving.toFixed(2).padStart(9) + '  ' + t.reason);
}
console.log('Would-be total to savings: R ' + sim.total.toFixed(2));
`;

export const communityKits: Kit[] = [
  {
    slug: 'payment-pinger',
    name: 'Payment Pinger',
    tagline: 'Preview a chat ping for every card payment, flag non-ZAR spend.',
    summary:
      'Launchpad mock adaptation of a community project that pushes card payment notifications to Telegram and emails an alert for non-ZAR transactions. Here you only preview the message text locally; nothing is sent.',
    category: 'Notifications',
    language: 'JavaScript',
    difficulty: 'Beginner',
    minutes: 15,
    origin: 'community',
    credit: {
      sourceReview: {
        checkedOn: null,
        repositoryUrl: 'https://github.com/roberto-aldera/card-payment-notifier',
        readmeUrl: 'https://api.github.com/repos/roberto-aldera/card-payment-notifier/readme',
        licenceUrl: 'https://api.github.com/repos/roberto-aldera/card-payment-notifier/license',
        licenceSha256: null,
      },
      authors: [{ name: 'Roberto Aldera', handle: '@roberto-aldera', url: 'https://github.com/roberto-aldera' }],
      links: [
        { label: 'roberto-aldera/card-payment-notifier', url: 'https://github.com/roberto-aldera/card-payment-notifier' },
        { label: 'Community Projects directory', url: DIRECTORY_URL },
      ],
      acknowledgements: ['Upstream acknowledges Russell Knight for inspiration and help.'],
      licence: 'MIT, Copyright (c) 2024 Roberto Aldera (main/LICENSE). Full notice included in the download.',
      upstream: 'Card code that sends a Telegram message per payment and emails a non-ZAR alert via a Canarytoken.',
      adaptation: 'Launchpad-authored offline preview: validates a mock transaction and prints the would-be message and alert. No Telegram, email or Canarytoken.',
    },
    scriptFile: 'payment-pinger.mjs',
    dataFile: 'payment-pinger-mock-data.json',
    script: pingerScript,
    mockData: { note: 'Fictional transactions. The last row is intentionally invalid.', transactions: pingerTxns },
    setup: [
      { title: 'Check Node', body: 'Node 18 or newer. Built-in modules only.', code: 'node --version' },
      { title: 'Make a folder', body: 'Put the script and mock JSON together.', code: 'mkdir payment-pinger && cd payment-pinger' },
      { title: 'Preview pings', body: 'Prints a Telegram-style preview per row and an alert preview for non-ZAR rows. The invalid row is reported and the exit code is 1.', code: 'node payment-pinger.mjs ./payment-pinger-mock-data.json' },
      { title: 'Experiment', body: 'Change a currency to GBP or break an amount and rerun.' },
      { title: 'Read upstream', body: 'Read the original README for how Telegram bot tokens and the Canarytoken are configured. Never paste real tokens into this mock.' },
    ],
    limitations: [
      'Sends nothing. Real delivery needs a Telegram bot, chat ID and an email channel, none of which are modelled.',
      'Transaction fields are simplified; real card-code transaction objects differ and amounts may be in cents.',
      'Upstream was reviewed from its README only. It was not executed here and is not certified compatible with current APIs.',
      'Not production-ready; notification code that fails silently can hide fraud.',
    ],
    checklist: [
      { id: 'download', label: 'Downloaded the script and mock data' },
      { id: 'run', label: 'Ran the preview against mock data' },
      { id: 'foreign', label: 'Triggered a non-ZAR alert preview' },
      { id: 'invalid', label: 'Saw an invalid row rejected' },
      { id: 'read', label: 'Read the upstream README and licence' },
      { id: 'limits', label: 'Reviewed the known limitations' },
    ],
    addedOrder: 4,
  },
  {
    slug: 'card-to-sheet-sync',
    name: 'Card-To-Sheet-Sync',
    tagline: 'Turn approved card transactions into spreadsheet rows, safely.',
    summary:
      'Independent Launchpad mock inspired by a community project that forwards approved transactions to Make and on to Google Sheets. Here you preview rows and export a formula-safe CSV; nothing connects to Sheets or Make.',
    category: 'Insights',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    minutes: 20,
    origin: 'community',
    credit: {
      sourceReview: {
        checkedOn: null,
        repositoryUrl: 'https://github.com/dominicsanto/card-to-sheet-sync',
        readmeUrl: 'https://api.github.com/repos/dominicsanto/card-to-sheet-sync/readme',
        licenceUrl: 'https://api.github.com/repos/dominicsanto/card-to-sheet-sync/license',
        licenceSha256: null,
      },
      authors: [{ name: 'Dominic Santo', handle: '@dominicsanto', url: 'https://github.com/dominicsanto' }],
      links: [
        { label: 'dominicsanto/card-to-sheet-sync', url: 'https://github.com/dominicsanto/card-to-sheet-sync' },
        { label: 'Community Projects directory', url: DIRECTORY_URL },
      ],
      licence: 'Upstream README declares MIT, but no standalone licence file was verified. No upstream code is copied; the mock is independently written.',
      upstream: 'Card code afterTransaction posts approved transactions to a Make webhook, which appends rows to Google Sheets.',
      adaptation: 'Launchpad-authored local row builder and CSV export with formula neutralisation and quoting. No webhook, Make or Sheets.',
    },
    scriptFile: 'card-to-sheet-sync.mjs',
    dataFile: 'card-to-sheet-sync-mock-data.json',
    script: sheetScript,
    mockData: { note: 'Fictional transactions, including a formula-injection row and an invalid date.', transactions: sheetTxns },
    setup: [
      { title: 'Check Node', body: 'Node 18 or newer. Built-in modules only.', code: 'node --version' },
      { title: 'Make a folder', body: 'Put the script and mock JSON together.', code: 'mkdir card-to-sheet-sync && cd card-to-sheet-sync' },
      { title: 'Build rows', body: 'Approved, valid rows are written to a CSV; declined and invalid rows are skipped with reasons.', code: 'node card-to-sheet-sync.mjs ./card-to-sheet-sync-mock-data.json out.csv' },
      { title: 'Open the CSV', body: 'Open out.csv in a spreadsheet. The HYPERLINK row shows as text, prefixed with an apostrophe, not as a live formula.' },
      { title: 'Read upstream', body: 'Read the original README for the Make scenario. Keep webhook URLs out of code and version control.' },
    ],
    limitations: [
      'No Make or Google Sheets connection. Real webhooks need retries, deduplication and secret handling.',
      'Upstream licence: README says MIT, standalone licence not verified. Check before reusing upstream code.',
      'Formula neutralisation prefixes risky cells with an apostrophe, which changes the stored text.',
      'Upstream was reviewed from its README only, not executed or certified compatible.',
    ],
    checklist: [
      { id: 'download', label: 'Downloaded the script and mock data' },
      { id: 'run', label: 'Generated a CSV from mock data' },
      { id: 'inject', label: 'Confirmed the formula row is neutralised' },
      { id: 'skip', label: 'Saw declined and invalid rows skipped' },
      { id: 'read', label: 'Read the upstream README and licence note' },
      { id: 'limits', label: 'Reviewed the known limitations' },
    ],
    addedOrder: 5,
  },
  {
    slug: 'swipe-n-save',
    name: "Swipe 'n Save",
    tagline: 'Simulate saving a percentage of every swipe, skipping ATMs.',
    summary:
      'Launchpad mock adaptation of a community card-code project that transfers a percentage of each purchase into savings. Here you set a percentage from 1 to 10000 and see would-be savings; ATM withdrawals (MCC 6011) are excluded and no money moves.',
    category: 'Savings',
    language: 'JavaScript',
    difficulty: 'Intermediate',
    minutes: 20,
    origin: 'community',
    credit: {
      sourceReview: {
        checkedOn: null,
        repositoryUrl: 'https://github.com/petersmythe/investec-swipe-n-save',
        readmeUrl: 'https://api.github.com/repos/petersmythe/investec-swipe-n-save/readme',
        licenceUrl: 'https://api.github.com/repos/petersmythe/investec-swipe-n-save/license',
        licenceSha256: null,
      },
      authors: [{ name: 'Peter Smythe', handle: '@petersmythe', url: 'https://github.com/petersmythe' }],
      links: [
        { label: 'petersmythe/investec-swipe-n-save', url: 'https://github.com/petersmythe/investec-swipe-n-save' },
        { label: 'Community Projects directory', url: DIRECTORY_URL },
      ],
      licence: 'MIT, Copyright (c) 2024 Peter Smythe (main/LICENSE). Full notice included in the download.',
      upstream: 'Card code IDE project that transfers a percentage of each purchase to savings; needs accounts and transfers OAuth scopes.',
      adaptation: 'Launchpad-authored offline calculator with validation. No credentials, no OAuth, no transfers.',
    },
    scriptFile: 'swipe-n-save.mjs',
    dataFile: 'swipe-n-save-mock-data.json',
    script: swipeScript,
    mockData: { note: 'Fictional purchases. MCC 6011 is an ATM withdrawal and is excluded.', percent: 10, transactions: swipeTxns },
    setup: [
      { title: 'Check Node', body: 'Node 18 or newer. Built-in modules only.', code: 'node --version' },
      { title: 'Make a folder', body: 'Put the script and mock JSON together.', code: 'mkdir swipe-n-save && cd swipe-n-save' },
      { title: 'Simulate', body: 'Uses the percent in the JSON (10%).', code: 'node swipe-n-save.mjs ./swipe-n-save-mock-data.json' },
      { title: 'Change the percent', body: 'Pass 1 to 10000 as the second argument. Try 0 or 20000 to see validation fail.', code: 'node swipe-n-save.mjs ./swipe-n-save-mock-data.json 250' },
      { title: 'Read upstream', body: 'Upstream needs real OAuth scopes for accounts and transfers. Keep credentials out of this folder.' },
    ],
    limitations: [
      'Moves no money. Real transfers need OAuth scopes, account IDs, idempotency and failure handling.',
      'High percentages (up to 10000%) can drain an account quickly in the real project; review carefully.',
      'Only MCC 6011 is excluded, mirroring upstream. Other cash-like codes are not.',
      'Upstream was reviewed from its README only, not executed or certified compatible.',
    ],
    checklist: [
      { id: 'download', label: 'Downloaded the script and mock data' },
      { id: 'run', label: 'Ran the simulation' },
      { id: 'percent', label: 'Tried a different percentage' },
      { id: 'atm', label: 'Confirmed the ATM row is excluded' },
      { id: 'read', label: 'Read the upstream README and licence' },
      { id: 'limits', label: 'Reviewed the known limitations' },
    ],
    addedOrder: 6,
  },
];
