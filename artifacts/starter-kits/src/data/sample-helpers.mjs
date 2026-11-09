// Fictional sample data only; no network or credentials.
// Response shapes follow the documented account envelopes so the samples read like the real thing.
const MAX_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER);

export function decimalToMinor(value) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new TypeError('Amount must be a decimal number or string.');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError('Amount must be finite.');
  }
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(value).trim());
  if (!match) throw new TypeError('Amount must be a decimal number.');

  const sign = match[1] === '-' ? -1n : 1n;
  const fraction = match[3] ?? '';
  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) {
    throw new RangeError('Amount exponent is outside the supported range.');
  }
  const digits = BigInt(`${match[2]}${fraction}`);
  const scale = fraction.length - exponent;
  let minor;
  if (scale <= 2) {
    minor = digits * (10n ** BigInt(2 - scale));
  } else {
    const divisor = 10n ** BigInt(scale - 2);
    const quotient = digits / divisor;
    const remainder = digits % divisor;
    minor = quotient + (remainder * 2n >= divisor ? 1n : 0n);
  }
  minor *= sign;
  if (minor > MAX_MINOR_UNITS || minor < -MAX_MINOR_UNITS) {
    throw new RangeError('Amount exceeds the safe integer range.');
  }
  return Number(minor);
}

export function transactionAmountMinor(transaction) {
  if (transaction?.type !== 'CREDIT' && transaction?.type !== 'DEBIT') {
    throw new TypeError('Transaction type must be CREDIT or DEBIT.');
  }
  const amount = Math.abs(decimalToMinor(transaction.amount));
  return transaction.type === 'DEBIT' ? -amount : amount;
}

export function normalizeTransaction(transaction, currency, index = 0) {
  if (!transaction || !['POSTED', 'PENDING'].includes(transaction.status)) {
    throw new TypeError('Transaction status must be POSTED or PENDING.');
  }
  const date = transaction.postingDate || transaction.transactionDate || transaction.valueDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError('Transaction must include a documented transaction date.');
  }
  if (typeof transaction.description !== 'string') {
    throw new TypeError('Transaction description must be a string.');
  }
  return {
    id: typeof transaction.uuid === 'string' && transaction.uuid
      ? transaction.uuid
      : `${date}:${index}:${transaction.description}`,
    accountId: transaction.accountId,
    type: transaction.type,
    transactionType: transaction.transactionType,
    status: transaction.status,
    description: transaction.description,
    currency,
    amount: transaction.amount,
    amountMinor: transactionAmountMinor(transaction),
    postingDate: transaction.postingDate,
    valueDate: transaction.valueDate,
    transactionDate: transaction.transactionDate,
    date,
    postedOrder: transaction.postedOrder,
  };
}

function assertEnvelope(payload, field, label) {
  if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
    throw new Error(`${label} sample has an invalid data envelope.`);
  }
  if (field && !Array.isArray(payload.data[field])) {
    throw new Error(`${label} sample does not contain data.${field}.`);
  }
  return payload;
}

export function createSampleData(fixtures = {}) {
  function fixture(key) {
    const value = fixtures[key];
    if (value === null || value === undefined) {
      throw new Error(`No sample data is available for ${key}.`);
    }
    return value;
  }

  function fixtureByAccount(key, accountId) {
    const keyed = fixtures[key]?.[accountId];
    return keyed ?? fixture(key);
  }

  async function listAccounts() {
    return assertEnvelope(fixture('accounts'), 'accounts', 'Accounts');
  }

  async function getBalance(accountId) {
    const value = fixtures.balances?.[accountId] ?? fixtures.balances ?? fixtures.balance;
    if (!value) throw new Error('No sample data is available for balance.');
    if (!value.data || typeof value.data.currentBalance !== 'number' || typeof value.data.currency !== 'string') {
      throw new Error('Sample balance is missing documented currentBalance or currency fields.');
    }
    return value;
  }

  async function getTransactions(accountId, filters = {}) {
    const source = assertEnvelope(fixtureByAccount('transactions', accountId), 'transactions', 'Transactions');
    const transactions = source.data.transactions.filter(row => {
      if (filters.includePending === false && row.status === 'PENDING') return false;
      if (filters.includePending === true && !['POSTED', 'PENDING'].includes(row.status)) return false;
      if (filters.fromDate && (row.postingDate || row.transactionDate || row.valueDate) < filters.fromDate) return false;
      if (filters.toDate && (row.postingDate || row.transactionDate || row.valueDate) > filters.toDate) return false;
      if (filters.transactionType && row.transactionType !== filters.transactionType) return false;
      return true;
    });
    return { ...source, data: { ...source.data, transactions } };
  }

  async function getPendingTransactions(accountId) {
    const pending = fixtures.pendingTransactions?.[accountId] ?? fixtures.pendingTransactions;
    if (pending) {
      const source = assertEnvelope(pending, 'transactions', 'Pending transactions');
      return { ...source, data: { ...source.data, transactions: source.data.transactions.filter(row => row.status === 'PENDING') } };
    }
    const all = fixtureByAccount('transactions', accountId);
    return { ...all, data: { ...all.data, transactions: all.data.transactions.filter(row => row.status === 'PENDING') } };
  }

  return { listAccounts, getBalance, getTransactions, getPendingTransactions };
}
