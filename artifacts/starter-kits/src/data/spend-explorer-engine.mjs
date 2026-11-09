// Spend Explorer engine (Launchpad illustrative example kit). Fictional data only; no network or credentials.
// Reads the documented data.transactions envelope; totals use exact integer minor units.
import { decimalToMinor } from './sample-helpers.mjs';

export function categorise(description) {
  const value = description.toLowerCase();
  if (/woolies|checkers|pick n pay/.test(value)) return 'Groceries';
  if (/gautrain|bolt|uber/.test(value)) return 'Transport';
  if (/coffee|kauai|nandos/.test(value)) return 'Eating out';
  if (/city power/.test(value)) return 'Utilities';
  if (/showmax|spotify/.test(value)) return 'Subscriptions';
  if (/engen|sasol/.test(value)) return 'Fuel';
  return 'Other';
}

export function spendRows(transactions) {
  return transactions.map((row, index) => ({
    id: row.uuid || `transaction-${index}`,
    date: row.postingDate || row.transactionDate || row.valueDate,
    description: row.description,
    category: categorise(row.description),
    amountMinor: Math.abs(decimalToMinor(row.amount)),
    status: row.status,
    type: row.type,
  }));
}

export function filterSpendRows(rows, { category = 'all', search = '' } = {}) {
  const wanted = category.toLowerCase();
  const text = search.toLowerCase();
  return rows.filter(row => (wanted === 'all' || row.category.toLowerCase() === wanted)
    && (!text || row.description.toLowerCase().includes(text)));
}

// Posted debits only; pending rows can change or disappear before posting. Largest total first.
export function postedDebitTotalsMinor(rows) {
  const totals = new Map();
  for (const row of rows) {
    if (row.status !== 'POSTED' || row.type !== 'DEBIT') continue;
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amountMinor);
  }
  return [...totals].sort((a, b) => b[1] - a[1]);
}
