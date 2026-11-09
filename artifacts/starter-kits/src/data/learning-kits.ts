import type { Kit } from './kits.ts';
import { learningEngineSource } from './learning-engine-source.ts';
import { runwayFixture, recurringFixture, reconciliationFixture } from './learning-fixtures.ts';
import { apiDownloadNote } from './official-api.ts';

const directory = 'https://github.com/Investec-Developer-Community/Community-Projects';
const reviewed = '2026-11-04';
const lifePilot = 'https://github.com/randallerasmus/investec-life-pilot';
const runway = 'https://github.com/sean-gordon/investec_runway';
const qualis = 'https://github.com/bandilleee/qualis';
const sourceReview = (repositoryUrl: string) => ({
  checkedOn: reviewed, repositoryUrl,
  readmeUrl: repositoryUrl.replace('github.com/', 'api.github.com/repos/') + '/readme',
  licenceUrl: repositoryUrl.replace('github.com/', 'api.github.com/repos/') + '/license',
  licenceSha256: null,
});
const commonLimits = [
  'Original Launchpad implementation inspired by the credited project ideas. Upstream READMEs were reviewed, not the running applications; no code or assets copied.',
  'The downloaded runner uses fictional offline JSON only; it does not read credentials or make network requests.',
  'Documented account amount fields are major units. Output fields ending in Minor are derived integer minor units (cents for ZAR), not API fields.',
  'Dates are fixed YYYY-MM-DD values in UTC, not today. Forecast schedules, invoice details and description matching remain teaching inputs.',
];

function makeKit(config: Omit<Kit, 'language' | 'origin' | 'scriptFile' | 'dataFile' | 'script' | 'setup' | 'checklist'> & {
  engine: string; expected: string; experiment: string;
}): Kit {
  const { engine, expected, experiment, ...kit } = config;
  const scriptFile = `${kit.slug}.mjs`, dataFile = `${kit.slug}-mock-data.json`;
  const credit = kit.credit!;
  const heading = [
    `${kit.name} — original Launchpad offline teaching implementation.`,
    `Inspiration: ${credit.authors.map(author => author.name).join(', ')}.`,
    `Source review: ${reviewed}; upstream README and licence availability only, not execution or audit.`,
    `Licence status: ${credit.licence}`, `Adaptation: ${credit.adaptation}`,
    ...credit.links.map(link => `${link.label}: ${link.url}`),
  ].map(line => `// ${line}`).join('\n');
  const script = `${heading}\n${apiDownloadNote(kit.slug)}\n${learningEngineSource}
import { createSampleData } from './sample-helpers.mjs';
import { readFileSync } from 'node:fs';
async function main() {
  const input = JSON.parse(readFileSync(process.argv[2] || './${dataFile}', 'utf8'));
  const client = createSampleData(input);
  const accountId = input.accountId;
  const posted = await client.getTransactions(accountId, { includePending: false });
  const pending = await client.getPendingTransactions(accountId);
  const transactions = {
    ...posted,
    data: {
      ...posted.data,
      transactions: [
        ...posted.data.transactions,
        ...pending.data.transactions.filter(row => row.status === 'PENDING'),
      ],
    },
  };
  const resultInput = { ...input, transactions, balance: await client.getBalance(accountId) };
  console.log(JSON.stringify(${engine}(resultInput), null, 2));
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Kit run failed.');
  process.exitCode = 1;
});
`;
  return {
    ...kit, language: 'JavaScript', origin: 'community', usesInvestecApi: true, scriptFile, dataFile, script,
    setup: [
      { title: 'Check Node', body: 'Requires Node.js 20.12 or newer. No packages are needed for mock mode.', code: 'node --version' },
      { title: 'Extract the starter', body: `Download the ZIP, extract it, then cd ${kit.slug}.` },
      { title: 'Run the example', body: expected, code: `node ${scriptFile} ./${dataFile}` },
      { title: 'Change the fixture', body: experiment },
    ],
    checklist: [
      { id: 'try', label: 'Try the browser controls and inspect the result' },
      { id: 'run', label: 'Run the downloaded script with its fictional fixture' },
      { id: 'change', label: 'Change one input and explain the changed result' },
      { id: 'review', label: 'Review limitations and the official API differences' },
    ],
  };
}

export const learningKits: Kit[] = [
  makeKit({
    slug: 'cashflow-runway', name: 'Cashflow Runway',
    tagline: 'Project 30 days of fictional cashflow and test a purchase.',
    summary: 'See why today’s balance is not a forecast. Combine dated income, bills and daily spending, then inspect how a what-if purchase changes the lowest daily closing balance.',
    category: 'Insights', difficulty: 'Beginner', minutes: 15, addedOrder: 7,
    credit: {
      sourceReview: sourceReview(runway),
      authors: [
        { name: 'Sean Gordon', handle: '@sean-gordon', url: 'https://github.com/sean-gordon' },
        { name: 'Randall Erasmus', handle: '@randallerasmus', url: 'https://github.com/randallerasmus' },
      ],
      links: [{ label: 'Investec Runway / Gordon Finance Engine', url: runway }, { label: 'LifePilot', url: lifePilot }, { label: 'Community Projects directory', url: directory }],
      licence: 'Both upstream LICENSE files declare MIT: Copyright (c) 2026 Sean Gordon and Copyright (c) 2026 Randall Erasmus. No upstream code or assets reused.',
      upstream: 'Runway describes cashflow runway and what-if costs; LifePilot describes dated balance forecasts and risk windows. READMEs reviewed only.',
      adaptation: 'Independent deterministic 30-day closing-balance calculation from explicit schedules. No AI, Monte Carlo modelling, transaction inference or card guardrail.',
    },
    engine: 'forecast', mockData: runwayFixture,
    expected: 'Prints JSON with 30 daily rows. lowestMinor is 100000 on 2026-11-24; firstShortfall is null (no shortfall within these 30 days, not unlimited runway).',
    experiment: 'Set purchase.amount to 5000 (ZAR 5,000). The lowest balance becomes -400000 and the first shortfall is 2026-11-10. Keep purchase.date within the 30-day window.',
    limitations: [...commonLimits, 'Educational projection, not financial advice. No interest, fees, overdraft rules or unlisted costs. Daily closing balances do not model intraday timing; absence of a shortfall only covers the 30-day window.'],
  }),
  makeKit({
    slug: 'recurring-payment-detective', name: 'Recurring Payment Detective',
    tagline: 'Find likely monthly payments and explain the evidence.',
    summary: 'Group fictional posted debits by normalised merchant, then compare monthly timing and amounts. Inspect likely repeats alongside irregular purchases and insufficient evidence.',
    category: 'Insights', difficulty: 'Intermediate', minutes: 20, addedOrder: 8,
    credit: {
      sourceReview: sourceReview(lifePilot),
      authors: [{ name: 'Randall Erasmus', handle: '@randallerasmus', url: 'https://github.com/randallerasmus' }],
      links: [{ label: 'LifePilot', url: lifePilot }, { label: 'Community Projects directory', url: directory }],
      licence: 'Upstream LICENSE declares MIT, Copyright (c) 2026 Randall Erasmus. No upstream code or assets reused.',
      upstream: 'LifePilot documents recurring-payment detection using cadence, amount stability and confidence, alongside forecasts. README reviewed only.',
      adaptation: 'Independent transparent monthly heuristic, not LifePilot’s detector. At least three posted debits in consecutive months, similar dates and amounts within 10% of the upper median.',
    },
    engine: 'detectRecurring', mockData: recurringFixture,
    expected: 'Prints four merchant groups: DEMO GYM and DEMO STREAMING are likely repeats; DEMO CAFE and DEMO BOOKS are not. One pending row is ignored. Gym’s estimated next date is 2026-11-30.',
    experiment: 'Change the last gym amount from 499 to 699. Its amount variation now fails the rule, so it is no longer marked likely. Try a missing month or a fourth observation.',
    limitations: [...commonLimits, 'Monthly cadence only: consecutive calendar months with day-of-month difference at most four, or consecutive month ends. Weekly/annual bills, skipped months and variable amounts may be missed.',
      'Merchant normalisation only trims/collapses whitespace and changes case. It cannot prove merchant identity. A likely repeat is not a confirmed subscription; an estimated next date may already be past the fixture as-of date.'],
  }),
  makeKit({
    slug: 'who-paid', name: 'Who Paid?',
    tagline: 'Match fictional invoice references and flag payments to review.',
    summary: 'Reconcile explicit invoices with incoming payments. See paid, partial and overdue invoices, plus unmatched and ambiguous payments that must not silently settle an invoice.',
    category: 'Accounting', difficulty: 'Intermediate', minutes: 20, addedOrder: 9,
    credit: {
      sourceReview: sourceReview(qualis),
      authors: [{ name: '@bandilleee', handle: '@bandilleee', url: 'https://github.com/bandilleee' }],
      links: [{ label: 'Qualis', url: qualis }, { label: 'Community Projects directory', url: directory }],
      licence: 'No standalone upstream licence grant verified through the repository licence endpoint on 2026-11-04. No upstream code or assets reused.',
      upstream: 'Qualis describes inferring payment patterns from transaction history without invoice entry. README reviewed only; its integration and security claims were not verified.',
      adaptation: 'Independent explicit-invoice reconciliation example inspired by the business problem, not a reproduction of Qualis’s inference model. No debt is inferred from bank history.',
    },
    engine: 'reconcile', mockData: reconciliationFixture,
    expected: 'Prints five invoices: one paid, one partial, three unpaid; two have overdue balances. Payments include two matched, one unmatched and one ambiguous. No messages or payments are sent.',
    experiment: 'Change pay-2 amount to 3000 to settle WEB-102. Changing pay-3 description to SHARED makes it ambiguous; descriptions are not a documented transaction reference field.',
    limitations: [...commonLimits, 'Exact normalised reference matching only (case and whitespace). Duplicate references stay ambiguous even if an amount appears to fit. Duplicate IDs are rejected.',
      'Payments are considered in fixture order. Amounts exceeding the remaining balance are left unmatched; no overpayment splitting, refunds, foreign exchange or automatic reminders. Overdue means a positive unpaid balance strictly after the invoice due date.'],
  }),
];
