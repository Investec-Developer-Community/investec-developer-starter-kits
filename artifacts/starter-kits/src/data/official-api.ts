/** Official portal OpenAPI payloads reviewed directly, not live API responses. */
export const API_REVIEW_DATE = '2026-10-14';
export const officialDocs = {
  bank: { label: 'Private Bank API', url: 'https://developer.investec.com/api-reference/SA%20PB%20Account%20Information' },
  card: { label: 'Card API', url: 'https://developer.investec.com/api-reference/SA%20Card%20Code' },
  auth: { label: 'Authorisation API (OAuth)', url: 'https://developer.investec.com/api-reference/SA%20Open%20API%20-%20Authorization' },
};
export const authNote = 'Real API access uses OAuth: the client-credentials flow requires client_id, client_secret and x-api-key, then a bearer token. The Card API quickstart requires the cards scope; account reads require accounts. Third-party access uses a separate approved 3-legged OAuth flow. None of the Launchpad downloads authenticates or requires credentials.';
const balanceNote = 'The balance response uses data.currentBalance, availableBalance and currency—not our transactional.balance or loan.balance. These are distinct balances, not interchangeable spendable amounts. The official API also provides GET /za/pb/v1/accounts/{accountId}/pending-transactions; our single pendingAmount is a teaching simplification, not a field from that response.';
const transferNote = 'The current documented transfer operation is POST /za/pb/v1/accounts/{accountId}/transfermultiple. Its transferList entries contain beneficiaryAccountId, amount as a string, myReference and theirReference; profileId is optional. Our calculator is not a transfer request and does not handle authorisation requirements or transfer outcomes. The historical project prerequisites do not establish current endpoint permissions: confirm them in the portal before integration.';
const cardNote = 'Our amount is in major currency units (R 100 means 100 rand). The Card API simulation request uses centsAmount as a string (for example "10000"), currencyCode, merchantCode as a number, merchantName and merchantCity. Logged runtime examples use numeric centsAmount and nested merchant.category.code; simulation request fields are not the runtime event schema. Do not pass this mock JSON straight to either.';
const eventNote = 'Official code examples use beforeTransaction(authorization) during authorisation with a limited execution time, and afterTransaction(transaction) after a transaction. Our local scripts run neither hook. Our approved/declined labels are local teaching values, not proof of settlement or the official event contract.';
export const accountKitSlugs = ['interest-maximiser', 'spend-explorer', 'cashflow-runway', 'recurring-payment-detective', 'who-paid'];
export function apiAlignment(slug: string) {
  const bankOnly = accountKitSlugs.includes(slug);
  const docs = bankOnly ? [officialDocs.bank, officialDocs.auth] : slug === 'swipe-n-save'
    ? [officialDocs.card, officialDocs.bank, officialDocs.auth] : [officialDocs.card, officialDocs.auth];
  const notes = slug === 'interest-maximiser' ? [balanceNote, transferNote]
    : slug === 'spend-explorer' ? [
      'Official account transactions are under data.transactions with status POSTED/PENDING and type CREDIT/DEBIT. Our lowercase posted/pending, date and hand-assigned category are local fields. Do not infer debit/credit direction from our positive spending amounts.',
      'The account schema describes amount as monetary units in the account currency. This is not the Card API centsAmount convention. Pending transactions also have a separate endpoint; our sample list is not a complete reconciliation model.',
    ] : ['cashflow-runway', 'recurring-payment-detective', 'who-paid'].includes(slug) ? [
      'Private Bank reference rechecked 2026-11-04 (portal documentation, not live calls). Account transactions are returned in data.transactions. POSTED/PENDING and CREDIT/DEBIT describe status and direction; these scripts still use a simplified teaching schema, not the response contract.',
      'These examples require explicit currency and integer amountMinor values. Official account examples express amounts in major currency units, so a real adapter must validate currency and convert decimal amounts exactly. Do not confuse these with the Card API centsAmount field.',
      'Our scheduled events, merchant labels, invoice references and due dates are fictional application inputs. They are not guaranteed bank fields. No future bill, invoice debt or forecast can be established from the bank balance alone. Pending rows are not treated as settled payments.',
    ] : [cardNote, eventNote, ...(slug === 'swipe-n-save' ? [transferNote, 'The mock mcc string and ATM exclusion 6011 reflect the community idea. They do not model all cash-like transactions, reversals, retries or available funds.'] : [])];
  return { docs, notes };
}
export function apiDownloadNote(slug: string) {
  const { docs, notes } = apiAlignment(slug);
  return ['Launchpad API guidance reviewed ' + API_REVIEW_DATE + '; offline teaching schema, not a live API payload.',
    ...docs.map(d => d.label + ': ' + d.url), ...notes, authNote].map(line => '// ' + line).join('\n') + '\n';
}
