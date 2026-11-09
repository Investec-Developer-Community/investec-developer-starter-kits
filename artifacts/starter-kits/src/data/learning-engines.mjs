// Original Launchpad teaching algorithms. Fictional data only; no network or credentials.
// Bank inputs use documented envelopes; calculations use exact integer minor units.
import { decimalToMinor, normalizeTransaction } from './sample-helpers.mjs';
function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
function money(value, label, minimum = 0) {
  requireValue(Number.isSafeInteger(value) && value >= minimum, `${label} must be safe integer minor units, at least ${minimum}.`);
  return value;
}
function major(value, label, minimum = 0) {
  let converted;
  try { converted = decimalToMinor(value); }
  catch (error) {
    if (error instanceof RangeError && error.message.includes('safe integer')) {
      throw new Error(`${label} exceeds the safe integer range.`);
    }
    throw new Error(`${label} must be a valid decimal amount.`);
  }
  return money(converted, label, minimum);
}
function addMoney(a, b) {
  const value = a + b;
  requireValue(Number.isSafeInteger(value), 'Money total exceeds safe integer range.');
  return value;
}
function day(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Dates must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00Z`);
  requireValue(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, `Invalid date: ${value}`);
  return date;
}
function iso(date) { return date.toISOString().slice(0, 10); }
function text(value, label) {
  requireValue(typeof value === 'string' && value.trim().length > 0, `${label} is required.`);
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
function currency(value) {
  requireValue(typeof value === 'string' && /^[A-Z]{3}$/.test(value), 'Currency must be an explicit three-letter uppercase code.');
  return value;
}
function sameCurrency(row, expected) {
  requireValue(currency(row.currency) === expected, 'Mixed currencies are not supported. Use separate fixtures per currency.');
}
function uniqueIds(rows, label) {
  requireValue(Array.isArray(rows), `${label} must be an array.`);
  const seen = new Set();
  for (const row of rows) {
    const id = text(row.id, `${label} ID`);
    requireValue(!seen.has(id), `Duplicate ${label} ID: ${id}`);
    seen.add(id);
  }
}

function transactions(envelope, unit) {
  requireValue(envelope?.data && Array.isArray(envelope.data.transactions), 'Transactions must use the official data.transactions envelope.');
  return envelope.data.transactions.map((row, index) => normalizeTransaction(row, unit, index));
}

function validateBalance(balance, unit) {
  requireValue(balance?.data && currency(balance.data.currency) === unit, 'Balance must use the official data envelope and match the requested currency.');
}

export function forecast(input) {
  const unit = currency(input.currency);
  const start = day(input.startDate);
  const accountBalance = input.balance?.data;
  validateBalance(input.balance, unit);
  let balance = major(accountBalance.currentBalance, 'Starting balance', -Number.MAX_SAFE_INTEGER);
  const daily = major(input.dailySpend, 'Daily spend');
  const purchase = major(input.purchase?.amount, 'Purchase');
  const purchaseDate = input.purchase?.date;
  day(purchaseDate);
  requireValue(purchaseDate >= input.startDate && purchaseDate <= iso(new Date(start.getTime() + 29 * 86400000)), 'Purchase date must fall within the 30-day forecast.');
  transactions(input.transactions, unit);
  uniqueIds(input.events, 'event');
  for (const event of input.events) {
    sameCurrency(event, unit);
    day(event.date);
    major(event.amount, 'Event amount', 1);
    requireValue(['income', 'bill'].includes(event.kind), 'Event kind must be income or bill.');
  }
  const days = [];
  for (let index = 0; index < 30; index++) {
    const date = iso(new Date(start.getTime() + index * 86400000));
    const openingMinor = balance;
    let incomeMinor = 0, billsMinor = 0;
    for (const event of input.events.filter(event => event.date === date)) {
      const eventMinor = major(event.amount, 'Event amount', 1);
      if (event.kind === 'income') incomeMinor = addMoney(incomeMinor, eventMinor);
      else billsMinor = addMoney(billsMinor, eventMinor);
    }
    const purchaseMinor = date === purchaseDate ? purchase : 0;
    balance = addMoney(addMoney(addMoney(addMoney(balance, incomeMinor), -billsMinor), -daily), -purchaseMinor);
    days.push({ date, openingMinor, incomeMinor, billsMinor, dailySpendMinor: daily, purchaseMinor, closingMinor: balance });
  }
  const lowest = days.reduce((a, b) => a.closingMinor <= b.closingMinor ? a : b);
  return { currency: unit, days, lowestMinor: lowest.closingMinor, lowestDate: lowest.date,
    firstShortfall: days.find(row => row.closingMinor < 0)?.date ?? null };
}

export function detectRecurring(input) {
  const unit = currency(input.currency);
  validateBalance(input.balance, unit);
  day(input.asOf);
  const rowsFromApi = transactions(input.transactions, unit);
  uniqueIds(rowsFromApi, 'transaction');
  const groups = new Map();
  let ignored = 0;
  for (const transaction of rowsFromApi) {
    sameCurrency(transaction, unit);
    day(transaction.date);
    money(Math.abs(transaction.amountMinor), 'Transaction amount', 1);
    requireValue(['POSTED', 'PENDING'].includes(transaction.status), 'Unknown transaction status.');
    requireValue(['CREDIT', 'DEBIT'].includes(transaction.type), 'Unknown transaction type.');
    const merchant = text(transaction.description, 'Description');
    if (transaction.status !== 'POSTED' || transaction.type !== 'DEBIT' || transaction.date > input.asOf) { ignored++; continue; }
    const list = groups.get(merchant) ?? [];
    list.push(transaction);
    groups.set(merchant, list);
  }
  const results = [];
  const monthEnd = d => d.getUTCDate() === new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  for (const [merchant, unsorted] of groups) {
    const rows = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = rows.map(row => Math.abs(row.amountMinor)).sort((a, b) => a - b);
    const typicalMinor = amounts[Math.floor(amounts.length / 2)];
    const stable = amounts.every(amount => Math.abs(amount - typicalMinor) <= Math.floor(typicalMinor / 10));
    const cadence = rows.slice(1).every((row, i) => {
      const a = day(rows[i].date), b = day(row.date);
      return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() === 1
        && ((monthEnd(a) && monthEnd(b)) || Math.abs(a.getUTCDate() - b.getUTCDate()) <= 4);
    });
    const likely = rows.length >= 3 && stable && cadence;
    const last = day(rows[rows.length - 1].date);
    const lastNextDay = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 2, 0)).getUTCDate();
    const next = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1,
      rows.every(row => monthEnd(day(row.date))) ? lastNextDay : Math.min(last.getUTCDate(), lastNextDay)));
    results.push({ merchant, observations: rows.length, typicalMinor, likely,
      estimatedNextDate: likely ? iso(next) : null,
      reason: rows.length < 3 ? 'Need at least three observations.'
        : !cadence ? 'Payments do not follow a consistent monthly cadence.'
        : !stable ? 'Amounts vary by more than 10% from the typical amount.'
        : `${rows.length} posted debits in consecutive months, similar dates and amounts within 10%. Estimate only, not a confirmed subscription.`,
    });
  }
  return { currency: unit, ignored, results: results.sort((a, b) => a.merchant.localeCompare(b.merchant)) };
}

export function reconcile(input) {
  const unit = currency(input.currency);
  validateBalance(input.balance, unit);
  day(input.asOf);
  uniqueIds(input.invoices, 'invoice');
  const rowsFromApi = transactions(input.transactions, unit);
  uniqueIds(rowsFromApi, 'payment');
  const invoices = input.invoices.map(invoice => {
    sameCurrency(invoice, unit);
    day(invoice.dueDate);
    const amountMinor = major(invoice.amount, 'Invoice amount', 1);
    return { ...invoice, amountMinor, reference: text(invoice.reference, 'Invoice reference'), paidMinor: 0 };
  });
  const payments = [];
  for (const payment of rowsFromApi) {
    day(payment.date);
    money(Math.abs(payment.amountMinor), 'Payment amount', 1);
    requireValue(['POSTED', 'PENDING'].includes(payment.status), 'Unknown payment status.');
    requireValue(['CREDIT', 'DEBIT'].includes(payment.type), 'Unknown payment type.');
    const description = text(payment.description, 'Payment description');
    let status = 'unmatched', reason = '', invoiceId = null;
    const matches = invoices.filter(invoice => invoice.reference === description);
    if (payment.status !== 'POSTED' || payment.type !== 'CREDIT' || payment.date > input.asOf) {
      reason = 'Only posted incoming payments on or before the as-of date are eligible.';
    } else if (matches.length > 1) {
      status = 'ambiguous'; reason = 'Multiple invoices share this reference. Manual review required.';
    } else if (matches.length === 0) {
      reason = 'No invoice has this reference.';
    } else {
      const invoice = matches[0];
      if (payment.amountMinor > invoice.amountMinor - invoice.paidMinor) {
        reason = 'Payment exceeds the remaining invoice balance. Review; nothing allocated.';
      } else {
        invoice.paidMinor = addMoney(invoice.paidMinor, payment.amountMinor);
        status = 'matched'; reason = 'Unique reference and currency; amount fits the remaining balance.';
        invoiceId = invoice.id;
      }
    }
    payments.push({ ...payment, description, status, reason, invoiceId });
  }
  return { currency: unit, payments, invoices: invoices.map(invoice => ({
    ...invoice, outstandingMinor: invoice.amountMinor - invoice.paidMinor,
    status: invoice.paidMinor === invoice.amountMinor ? 'paid' : invoice.paidMinor > 0 ? 'partial' : 'unpaid',
    overdue: invoice.paidMinor < invoice.amountMinor && invoice.dueDate < input.asOf,
  })) };
}
