/** Official portal OpenAPI payloads reviewed directly, not live API responses. */
export const API_REVIEW_DATE = '2026-10-14';
export const officialDocs = {
  bank: { label: 'Private Bank API', url: 'https://developer.investec.com/api-reference/SA%20PB%20Account%20Information' },
  card: { label: 'Card API', url: 'https://developer.investec.com/api-reference/SA%20Card%20Code' },
  auth: { label: 'Authorisation API (OAuth)', url: 'https://developer.investec.com/api-reference/SA%20Open%20API%20-%20Authorization' },
};
export const officialSandboxGuide = { label: 'Official sandbox guide', url: 'https://developer.investec.com/individuals#ind-howto-sandbox' };
export const officialNextStepNote = 'For optional next steps, use the official Investec resources below. Launchpad examples use fictional data and do not connect to a bank.';
export const accountKitSlugs = ['interest-maximiser', 'spend-explorer', 'cashflow-runway', 'recurring-payment-detective', 'who-paid'];
const accountSampleNotes = [
  'The approved Private Bank example uses data.transactions with type CREDIT/DEBIT and status POSTED/PENDING. amount is in monetary units of its currency: in a ZAR example, 123.45 means R123.45. Kit *Minor and signed amounts are locally derived from amount and type, not API fields; the approved example shows positive amounts for both types and does not define raw sign semantics.',
  'The documented transaction query names are fromDate, toDate, transactionType and includePending. The reviewed baseline does not specify date-boundary inclusivity or page-navigation behavior; it documents meta.totalPages and lists no page query parameter.',
  'Category labels are local derived fields, not account API fields. Who Paid? compares fictional invoice references with transaction descriptions as a local heuristic; the approved transaction schema has no reference property.',
];
const cardSampleNotes = [
  'The documented card simulation request includes simulationcode, string centsAmount, currencyCode, numeric merchantCode, merchantName, merchantCity and countryCode. The example uses centsAmount: "10000" for R100; this REST request is not the runtime hook argument.',
  'The example’s category label is assigned locally. merchant.category.code (a string) is a documented field of the authorization logged in the official /code/execute example; the docs do not establish that a local category or merchantCode determines its value.',
  'Documented: beforeTransaction returns true to approve or false to decline, and the hook argument fields shown in the official simulation log. This guidance does not infer a complete runtime event schema, afterDecline argument fields, non-boolean return or timeout behavior, or configuration mechanics.',
];
export function sampleShapeGuidance(slug?: string) {
  if (!slug) return [...accountSampleNotes, ...cardSampleNotes];
  return accountKitSlugs.includes(slug)
    ? [...accountSampleNotes]
    : [...cardSampleNotes];
}
const balanceNote = 'The balance fixture uses the documented data.currentBalance, availableBalance and currency fields. These balances are distinct and are not interchangeable spendable amounts. The official API also provides GET /za/pb/v1/accounts/{accountId}/pending-transactions; the kit derives a held-back estimate from those pending debit rows, not from a single pendingAmount field.';
const transferNote = 'The documented transfer operation is POST /za/pb/v1/accounts/{accountId}/transfermultiple. Its transferList entries contain beneficiaryAccountId, amount as a string, myReference and theirReference; profileId is optional. These examples only calculate a local estimate and do not create or execute a transfer request.';
const eventNote = 'The official examples describe beforeTransaction(authorization) during authorisation and afterTransaction(transaction) after a transaction. Local labels do not establish settlement or a complete runtime event contract.';
export function apiAlignment(slug: string) {
  const bankOnly = accountKitSlugs.includes(slug);
  const docs = bankOnly ? [officialDocs.bank, officialDocs.auth] : slug === 'swipe-n-save'
    ? [officialDocs.card, officialDocs.bank, officialDocs.auth] : [officialDocs.card, officialDocs.auth];
  const notes = slug === 'interest-maximiser' ? [balanceNote, transferNote]
    : bankOnly ? []
      : [eventNote, ...(slug === 'swipe-n-save' ? [transferNote, 'The mock MCC string and ATM exclusion 6011 reflect the community idea. They do not model all cash-like transactions, reversals, retries or available funds.'] : [])];
  return { docs, notes };
}
export function apiReadmeGuidance(slug: string) {
  const { docs, notes } = apiAlignment(slug);
  return [
    '## Illustrative API notes',
    'These notes describe sample shapes, not live responses or a compatibility guarantee.',
    ...sampleShapeGuidance(slug).map(note => `- ${note}`),
    ...notes.map(note => `- ${note}`),
    '',
    '### Official next steps',
    officialNextStepNote,
    ...docs.map(doc => `- [${doc.label}](${doc.url})`),
    `- [${officialSandboxGuide.label}](${officialSandboxGuide.url})`,
  ].join('\n');
}
export function apiDownloadNote(slug: string) {
  const { docs, notes } = apiAlignment(slug);
  return ['Launchpad API guidance reviewed ' + API_REVIEW_DATE + '; offline teaching schema, not a live API payload.',
    ...docs.map(d => d.label + ': ' + d.url),
    ...sampleShapeGuidance(slug), ...notes, officialNextStepNote,
    officialSandboxGuide.label + ': ' + officialSandboxGuide.url].map(line => '// ' + line).join('\n') + '\n';
}
