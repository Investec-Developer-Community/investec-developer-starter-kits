import { API_REVIEW_DATE, officialDocs } from './official-api.ts';

/** Independent teaching fixtures. Never imported by starter downloads or persistence. */
export const mappingReview = { date: API_REVIEW_DATE, sources: [officialDocs.card, officialDocs.bank] };

// ZAR-only teaching conversion: reject excess precision instead of silently rounding.
export function zarToCents(amount: string): string {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) throw new Error('Use a non-negative ZAR amount with at most two decimal places.');
  const [whole, fraction = ''] = amount.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount exceeds safe numeric cents.');
  return cents.toString();
}

export function accountStatus(status: string): 'posted' | 'pending' {
  if (status === 'POSTED') return 'posted';
  if (status === 'PENDING') return 'pending';
  throw new Error('Unknown account status; do not silently classify it.');
}

export const cardMockExample = {
  merchant: 'Fictional Corner Bakery', merchantCategory: 'Groceries', amount: 123.45,
};
export const cardRequestExample = {
  simulationcode: 'const beforeTransaction = async (authorization) => true;\nconst afterTransaction = async (transaction) => {};',
  centsAmount: '12345', currencyCode: 'zar', merchantCode: 5462,
  merchantName: 'Fictional Corner Bakery', merchantCity: 'Cape Town', countryCode: 'ZA',
};
export const cardRuntimeExample = {
  centsAmount: 12345, currencyCode: 'zar',
  merchant: { name: 'Fictional Corner Bakery', city: 'Cape Town', category: { code: '5462' }, country: { code: 'ZA' } },
};
export const accountMockExample = {
  id: 'fictional-1', date: '2026-10-01', description: 'Fictional Corner Bakery',
  category: 'Groceries', amount: 123.45, status: 'posted',
};
export const accountEnvelopeExample = {
  data: { transactions: [{
    accountId: 'fictional-account', uuid: 'fictional-transaction',
    type: 'DEBIT', status: 'POSTED', description: 'Fictional Corner Bakery',
    transactionDate: '2026-10-01', amount: 123.45,
  }] },
  links: { self: 'https://example.invalid/fictional-transactions' },
  meta: { totalPages: 1 },
};

/** These are unrelated observations, never successive states of one purchase. */
export const purchaseScenarios = [
  {
    id: 'pending', title: 'Pending purchase — outcome unknown',
    endpoint: 'GET /za/pb/v1/accounts/{accountId}/pending-transactions',
    transaction: {
      accountId: 'fictional-pending-account', type: 'DEBIT', status: 'PENDING',
      description: 'Fictional Harbour Cafe', transactionDate: '2026-10-02', amount: 84.50,
    },
    observation: 'A pending debit is visible in this fictional snapshot. It is not a posted charge.',
    limitation: 'If it disappears in a later snapshot, that absence alone does not prove a decline, cancellation, refund or settlement. No later outcome is supplied here.',
  },
  {
    id: 'posted-debit', title: 'Posted debit — no authorisation link',
    endpoint: 'GET /za/pb/v1/accounts/{accountId}/transactions',
    transaction: {
      accountId: 'fictional-debit-account', uuid: 'fictional-debit-row',
      type: 'DEBIT', status: 'POSTED', description: 'Fictional Hilltop Books',
      transactionDate: '2026-10-05', postingDate: '2026-10-06', amount: 219.90,
    },
    observation: 'This independent account record reports a posted debit. The documentation describes postingDate as the date the transaction affects your balance.',
    limitation: 'It does not identify the cafe purchase or the card simulation above. A posted debit alone does not establish which authorisation preceded it or guarantee final merchant settlement.',
  },
  {
    id: 'posted-credit', title: 'Posted credit — possible refund, not proof',
    endpoint: 'GET /za/pb/v1/accounts/{accountId}/transactions',
    transaction: {
      accountId: 'fictional-credit-account', uuid: 'fictional-credit-row',
      type: 'CREDIT', status: 'POSTED', description: 'Fictional Lakeside Outfitters refund',
      transactionDate: '2026-10-08', postingDate: '2026-10-09', amount: 65,
    },
    observation: 'This separate fictional record reports a posted credit. “Refund” is an invented description, not a verified refund classification.',
    limitation: 'CREDIT describes direction, not the reason for the money. Neither that type nor the description proves a refund of a particular debit, a full refund, or a reversal of the pending example.',
  },
] as const;

export const scenarioGuidance = [
  { title: 'Documented: status and direction are different', text: 'Account status uses POSTED/PENDING; type uses CREDIT/DEBIT. Amount is in account-currency monetary units. These examples assume ZAR and keep amounts positive; direction comes from type, not an invented negative refund amount.' },
  { title: 'Documented: a query is only a view', text: 'The transactions operation supports includePending=true and filters dates using postingDate. There is also a separate pending-transactions operation. An item missing from a response is not a lifecycle event; check query scope and response completeness before comparing snapshots.' },
  { title: 'Unverified: authorisation → posting → settlement', text: 'The Card API example runs beforeTransaction during authorisation and afterTransaction after a transaction. Neither hook name, a local approval nor a simulation result is a documented settlement confirmation. The reviewed contracts do not establish a guaranteed hook-to-account-row relationship or settlement timetable.' },
  { title: 'Unverified: disappearance → refund', text: 'A pending item disappearing is not evidence that money was credited back. A refund and a released pending amount are different concepts. This guide does not assign a cause to disappearance or promise when a refund will post.' },
  { title: 'Unverified: matching records', text: 'The pending schema has no uuid field; posted transaction examples include uuid. The reviewed documentation does not establish a stable pending-to-posted or original-debit-to-refund join. Matching amounts, merchants or dates is not proof, and these three scenarios must not be joined or netted together.' },
];

export function runScenarioChecks() {
  const [pending, debit, credit] = purchaseScenarios;
  return [
    { label: 'Pending purchase remains PENDING / DEBIT, not posted or refunded', passed: accountStatus(pending.transaction.status) === 'pending' && pending.transaction.type === 'DEBIT' },
    { label: 'Posted debit and posted credit share a status, not a direction', passed: accountStatus(debit.transaction.status) === 'posted' && accountStatus(credit.transaction.status) === 'posted' && debit.transaction.type === 'DEBIT' && credit.transaction.type === 'CREDIT' },
    { label: 'All three amounts stay positive major-unit values (84.50, 219.90, 65 ZAR)', passed: pending.transaction.amount === 84.50 && debit.transaction.amount === 219.90 && credit.transaction.amount === 65 },
    { label: 'Independent accounts: no invented pending → debit → refund chain', passed: new Set(purchaseScenarios.map(s => s.transaction.accountId)).size === 3 },
    { label: 'Pending fixture has no invented uuid or postingDate', passed: !('uuid' in pending.transaction) && !('postingDate' in pending.transaction) },
    { label: 'Posted debit and credit have distinct fictional row identifiers', passed: new Set([debit.transaction.uuid, credit.transaction.uuid]).size === 2 },
  ];
}

export const fieldMappings = [
  ['Mock amount: 123.45 ZAR', 'REST centsAmount: "12345"; runtime centsAmount: 12345', '×100 for this two-decimal currency. The REST request uses a string; the hook argument uses a number, as in the official simulation log. Values here are fictional.'],
  ['Mock merchant', 'REST merchantName; runtime merchant.name', 'Both documented: the REST property and the merchant.name hook field in the official simulation log.'],
  ['Mock merchantCategory / mcc', 'REST merchantCode: 5462; runtime merchant.category.code: "5462"', 'Both fields are documented, but no mapping between them or from a local category is established. Code 5462 is chosen for this fixture; do not infer it from “Groceries”.'],
  ['Mock approved / declined', 'No direct account status mapping', 'Local decision labels are not POSTED/PENDING or proof of settlement. beforeTransaction and afterTransaction are different hooks.'],
  ['Mock transactions[]', 'data.transactions[]', 'Documented account response envelope; links and meta are response siblings. This is not a Card event or the result of the simulation above.'],
  ['Mock amount: 123.45', 'Account amount: 123.45', 'Major units, not cents. ZAR account currency is assumed for this example; confirm account currency separately. Direction comes from CREDIT/DEBIT, never from the positive mock amount.'],
  ['Mock status: posted / pending', 'Account status: POSTED / PENDING', 'Explicit two-value conversion. Unknown values fail local checks rather than defaulting to posted.'],
  ['Mock date / id / category', 'transactionDate / uuid / no category mapping', 'Unverified semantics: date is an explicit teaching choice, not postingDate or valueDate; local id is not a bank identifier. Category is local enrichment, absent from the documented transaction schema.'],
];

export function runMappingChecks() {
  const rejects = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  return [
    { label: '123.45 ZAR → "12345" REST cents → 12345 numeric runtime cents', passed: zarToCents(String(cardMockExample.amount)) === cardRequestExample.centsAmount && Number(cardRequestExample.centsAmount) === cardRuntimeExample.centsAmount },
    { label: 'One cent and zero convert exactly', passed: zarToCents('0.01') === '1' && zarToCents('0') === '0' },
    { label: 'Excess precision and negative amounts are rejected', passed: rejects(() => zarToCents('1.005')) && rejects(() => zarToCents('-1')) },
    { label: 'Fictional runtime fixture repeats selected REST example values', passed: cardRequestExample.merchantName === cardRuntimeExample.merchant.name && String(cardRequestExample.merchantCode) === cardRuntimeExample.merchant.category.code },
    { label: 'Account envelope preserves major-unit amounts, without ×100', passed: accountEnvelopeExample.data.transactions[0].amount === accountMockExample.amount },
    { label: 'POSTED/PENDING map explicitly; unknown status is rejected', passed: accountStatus('POSTED') === accountMockExample.status && accountStatus('PENDING') === 'pending' && rejects(() => accountStatus('DECLINED')) },
  ];
}
