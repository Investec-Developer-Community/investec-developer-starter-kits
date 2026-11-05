export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
import { communityKits, DIRECTORY_URL } from './community-kits';
import { learningKits } from './learning-kits';
import type { SourceReview } from './source-review';
import { apiDownloadNote } from './official-api';

export type Category = 'Savings' | 'Insights' | 'Card controls' | 'Notifications' | 'Accounting';

export interface Kit {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  category: Category;
  language: 'JavaScript';
  difficulty: Difficulty;
  minutes: number;
  origin: 'community' | 'illustrative';
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
  setup: { title: string; body: string; code?: string }[];
  limitations: string[];
  checklist: { id: string; label: string }[];
  addedOrder: number;
}

const interestScript = `// Interest Maximiser starter (Launchpad community prototype)
// Inspired by Frikkie Snyman's investec-tools. Mock data only. No bank connection.
// Run: node interest-maximiser.mjs [mock-data.json]
import { readFileSync } from 'node:fs';

const file = process.argv[2] || './interest-maximiser-mock-data.json';
const data = JSON.parse(readFileSync(file, 'utf8'));

function transferable(balance, pending, reserve) {
  for (const [k, v] of Object.entries({ balance, pending, reserve })) {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(k + ' must be a number');
    if (v < 0) throw new Error(k + ' cannot be negative');
  }
  return Math.max(0, balance - pending - reserve);
}

const fmt = (n) => 'R ' + n.toFixed(2);
const { transactional, loan, pendingAmount, reserve } = data;
const amount = transferable(transactional.balance, pendingAmount, reserve);

console.log('MOCK RUN - nothing is transferred.');
console.log('Transactional balance: ' + fmt(transactional.balance));
console.log('Pending (held back):   ' + fmt(pendingAmount));
console.log('Reserve (held back):   ' + fmt(reserve));
console.log('Transferable:          ' + fmt(amount));
console.log('');
console.log('Before -> ' + transactional.name + ': ' + fmt(transactional.balance) + ' | ' + loan.name + ': ' + fmt(loan.balance));
console.log('After  -> ' + transactional.name + ': ' + fmt(transactional.balance - amount) + ' | ' + loan.name + ': ' + fmt(loan.balance + amount));
`;

const spendScript = `// Spend Explorer starter (Launchpad illustrative example kit)
// Fictional ZAR transactions only. No bank connection.
// Run: node spend-explorer.mjs [mock-data.json] [category] [search]
import { readFileSync } from 'node:fs';

const file = process.argv[2] || './spend-explorer-mock-data.json';
const category = (process.argv[3] || 'all').toLowerCase();
const search = (process.argv[4] || '').toLowerCase();
const { transactions } = JSON.parse(readFileSync(file, 'utf8'));

const filtered = transactions.filter((t) =>
  (category === 'all' || t.category.toLowerCase() === category) &&
  (!search || t.description.toLowerCase().includes(search))
);

const totals = {};
for (const t of filtered) {
  if (t.status !== 'posted') continue; // pending excluded from totals
  totals[t.category] = (totals[t.category] || 0) + t.amount;
}

console.log('MOCK DATA - ' + filtered.length + ' matching transactions');
for (const t of filtered) {
  console.log(t.date + '  ' + t.description.padEnd(28) + ' R ' + t.amount.toFixed(2).padStart(9) + '  ' + t.status);
}
console.log('\\nPosted totals by category:');
for (const [c, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + c.padEnd(14) + ' R ' + v.toFixed(2));
}
`;

const cardScript = `// Mock Card Rules starter (Launchpad illustrative example kit)
// Not related to the community Card Guard project by CSTech.
// Simulates an approve/decline decision on a mock purchase. No bank or card connection.
// Run: node mock-card-rules.mjs [mock-data.json]
import { readFileSync } from 'node:fs';

const file = process.argv[2] || './mock-card-rules-mock-data.json';
const { rules, purchases } = JSON.parse(readFileSync(file, 'utf8'));

function decide(purchase, rules) {
  if (!Number.isFinite(purchase.amount) || purchase.amount <= 0) {
    return { approved: false, reason: 'Invalid amount' };
  }
  const blocked = rules.blockedCategories.map((c) => c.toLowerCase());
  if (blocked.includes(purchase.merchantCategory.toLowerCase())) {
    return { approved: false, reason: 'Merchant category ' + purchase.merchantCategory + ' is restricted' };
  }
  if (purchase.amount > rules.spendLimit) {
    return { approved: false, reason: 'Amount exceeds limit of R ' + rules.spendLimit.toFixed(2) };
  }
  return { approved: true, reason: 'Within limit and merchant allowed' };
}

console.log('MOCK SIMULATION - no card is charged or blocked.');
for (const p of purchases) {
  const d = decide(p, rules);
  console.log((d.approved ? 'APPROVE' : 'DECLINE') + '  ' + p.merchant.padEnd(22) + ' R ' + p.amount.toFixed(2).padStart(9) + '  ' + d.reason);
}
`;

export const spendTransactions = [
  { id: 't1', date: '2025-03-01', description: 'Woolies Food Rosebank', category: 'Groceries', amount: 842.35, status: 'posted' },
  { id: 't2', date: '2025-03-02', description: 'Gautrain Sandton', category: 'Transport', amount: 74.0, status: 'posted' },
  { id: 't3', date: '2025-03-03', description: 'Bean There Coffee', category: 'Eating out', amount: 46.5, status: 'posted' },
  { id: 't4', date: '2025-03-04', description: 'City Power prepaid', category: 'Utilities', amount: 600.0, status: 'posted' },
  { id: 't5', date: '2025-03-05', description: 'Checkers Sixty60', category: 'Groceries', amount: 517.89, status: 'posted' },
  { id: 't6', date: '2025-03-06', description: 'Bolt trip Braamfontein', category: 'Transport', amount: 63.2, status: 'posted' },
  { id: 't7', date: '2025-03-07', description: 'Kauai Melrose Arch', category: 'Eating out', amount: 112.0, status: 'posted' },
  { id: 't8', date: '2025-03-08', description: 'Showmax subscription', category: 'Subscriptions', amount: 99.0, status: 'posted' },
  { id: 't9', date: '2025-03-09', description: 'Engen Jan Smuts', category: 'Transport', amount: 950.4, status: 'posted' },
  { id: 't10', date: '2025-03-10', description: 'Spotify Family', category: 'Subscriptions', amount: 119.99, status: 'posted' },
  { id: 't11', date: '2025-03-11', description: 'Pick n Pay Parkhurst', category: 'Groceries', amount: 388.6, status: 'pending' },
  { id: 't12', date: '2025-03-12', description: 'Nandos Greenside', category: 'Eating out', amount: 231.5, status: 'pending' },
];

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
    mockData: {
      note: 'Fictional data for local experimentation only.',
      transactional: { name: 'Private Bank Account (mock)', balance: 18450.75 },
      loan: { name: 'Home Loan (mock)', balance: -1284330.12 },
      pendingAmount: 2315.4,
      reserve: 5000,
    },
    setup: [
      { title: 'Check Node', body: 'Any Node 18 or newer works. No npm install is needed: the script only uses built-in modules.', code: 'node --version' },
      { title: 'Make a folder', body: 'Put both downloaded files side by side in a fresh folder.', code: 'mkdir interest-maximiser && cd interest-maximiser' },
      { title: 'Run against mock data', body: 'The script reads the JSON, validates inputs and prints before/after balances. Nothing is transferred.', code: 'node interest-maximiser.mjs ./interest-maximiser-mock-data.json' },
      { title: 'Experiment', body: 'Edit pendingAmount or reserve in the JSON and rerun. Try a negative reserve to see validation fail.', code: 'node interest-maximiser.mjs' },
      { title: 'Read the original', body: 'Compare with the community source repo and article before writing anything that talks to a real API.' },
    ],
    limitations: [
      'Pending transactions are a single mock number here. Real pending data can arrive late, change amount, or be missing entirely, so a real reserve must be generous.',
      'The original community repo was written against an earlier version of the programmable banking APIs and tooling. Endpoints, auth flows and dependencies may no longer match; treat it as a reference, not a drop-in.',
      'No real transfer logic, scheduling, retries, idempotency or cut-off-time handling is included.',
      'Interest savings depend on your actual loan terms. This kit does not calculate interest.',
      'Not production-ready banking logic. Do not point it at real accounts without your own review.',
    ],
    checklist: [
      { id: 'node', label: 'Confirmed Node 18+ is installed' },
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
    scriptFile: 'spend-explorer.mjs',
    dataFile: 'spend-explorer-mock-data.json',
    script: spendScript,
    mockData: { note: 'Fictional ZAR transactions for local experimentation only.', transactions: spendTransactions },
    setup: [
      { title: 'Check Node', body: 'Node 18 or newer. Built-in modules only, no install step.', code: 'node --version' },
      { title: 'Make a folder', body: 'Place the script and mock JSON together.', code: 'mkdir spend-explorer && cd spend-explorer' },
      { title: 'Run everything', body: 'Lists all transactions and posted totals per category.', code: 'node spend-explorer.mjs ./spend-explorer-mock-data.json' },
      { title: 'Filter', body: 'Pass a category and optional search text.', code: 'node spend-explorer.mjs ./spend-explorer-mock-data.json transport bolt' },
      { title: 'Extend', body: 'Add your own fictional rows to the JSON, or a month filter, and rerun.' },
    ],
    limitations: [
      'Pending transactions are listed but excluded from totals. Real pending items can change amount or disappear before posting.',
      'Categories are hand-assigned in the mock data. Real transaction data may not include a category you can rely on.',
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
    name: 'Mock Card Rules',
    tagline: 'Approve or decline a mock purchase against your rules.',
    summary:
      'A new illustrative example kit created for Launchpad. Applies a spend limit and a merchant-category restriction to simulated card purchases and explains each approve or decline decision. A safe sandbox for thinking about card rules.',
    category: 'Card controls',
    language: 'JavaScript',
    difficulty: 'Advanced',
    minutes: 30,
    origin: 'illustrative',
    scriptFile: 'mock-card-rules.mjs',
    dataFile: 'mock-card-rules-mock-data.json',
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
    setup: [
      { title: 'Check Node', body: 'Node 18 or newer. No dependencies.', code: 'node --version' },
      { title: 'Make a folder', body: 'Put the script and mock JSON together.', code: 'mkdir mock-card-rules && cd mock-card-rules' },
      { title: 'Simulate', body: 'Evaluates each mock purchase and prints the decision with a reason.', code: 'node mock-card-rules.mjs ./mock-card-rules-mock-data.json' },
      { title: 'Tune the rules', body: 'Change spendLimit or blockedCategories in the JSON and rerun to see decisions flip.' },
      { title: 'Think about failure', body: 'Before any real use, decide what should happen if your rule code is slow or crashes. This kit does not answer that.' },
    ],
    limitations: [
      'Decisions are simulated locally. Real card-code environments have strict time limits, different inputs and their own runtime rules.',
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
].map(kit => ({ ...kit, script: apiDownloadNote(kit.slug) + kit.script })) as Kit[];

// Preserve existing kit order and routes; new teaching examples extend the catalogue.
kits.push(...learningKits);
export const getKit = (slug: string) => kits.find((k) => k.slug === slug);

// Shared demo logic, mirrors downloadable scripts
export function computeTransferable(balance: number, pending: number, reserve: number) {
  return Math.max(0, balance - pending - reserve);
}

export function decidePurchase(
  p: { amount: number; merchantCategory: string },
  rules: { spendLimit: number; blockedCategories: string[] },
) {
  if (!Number.isFinite(p.amount) || p.amount <= 0) return { approved: false, reason: 'Invalid amount' };
  if (rules.blockedCategories.map((c) => c.toLowerCase()).includes(p.merchantCategory.toLowerCase()))
    return { approved: false, reason: `Merchant category ${p.merchantCategory} is restricted` };
  if (p.amount > rules.spendLimit) return { approved: false, reason: `Amount exceeds limit of ${zar(rules.spendLimit)}` };
  return { approved: true, reason: 'Within limit and merchant allowed' };
}

export const zar = (n: number) =>
  'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
