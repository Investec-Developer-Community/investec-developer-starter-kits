const accountId = 'demo-account-001';

function transaction(
  uuid: string,
  date: string,
  description: string,
  amount: number,
  type: 'CREDIT' | 'DEBIT',
  status: 'POSTED' | 'PENDING' = 'POSTED',
) {
  return {
    accountId,
    type,
    status,
    description,
    postingDate: date,
    valueDate: date,
    transactionDate: date,
    amount,
    uuid,
  };
}

function transactionEnvelope(rows: ReturnType<typeof transaction>[]) {
  return {
    data: { transactions: rows },
    links: { self: `/za/pb/v1/accounts/${accountId}/transactions` },
    meta: { totalPages: 1 },
  };
}

function balanceEnvelope(currentBalance: number) {
  return {
    data: {
      accountId,
      currentBalance,
      availableBalance: currentBalance,
      budgetBalance: 0,
      straightBalance: currentBalance,
      cashBalance: 0,
      currency: 'ZAR',
    },
    links: { self: `/za/pb/v1/accounts/${accountId}/balance` },
    meta: { totalPages: 1 },
  };
}

export const runwayFixture = {
  accountId,
  currency: 'ZAR',
  startDate: '2026-11-01',
  balance: balanceEnvelope(15000),
  transactions: transactionEnvelope([
    transaction('runway-history', '2026-10-31', 'Demo posted history', 31.09, 'DEBIT'),
  ]),
  dailySpend: 250,
  purchase: { amount: 0, date: '2026-11-10' },
  events: [
    { id: 'rent', currency: 'ZAR', date: '2026-11-02', amount: 7000, kind: 'bill' as const },
    { id: 'insurance', currency: 'ZAR', date: '2026-11-05', amount: 1000, kind: 'bill' as const },
    { id: 'salary', currency: 'ZAR', date: '2026-11-25', amount: 20000, kind: 'income' as const },
  ],
};

export const recurringFixture = {
  accountId,
  currency: 'ZAR',
  asOf: '2026-11-04',
  balance: balanceEnvelope(15000),
  transactions: transactionEnvelope([
    ...['2026-08-31', '2026-09-30', '2026-10-31'].map((date, index) =>
      transaction(`gym-${index}`, date, ['Demo Gym', ' demo gym ', 'DEMO GYM'][index], 499, 'DEBIT')),
    ...['2026-08-12', '2026-09-13', '2026-10-12'].map((date, index) =>
      transaction(`stream-${index}`, date, 'Demo Streaming', 199, 'DEBIT')),
    ...['2026-08-02', '2026-08-19', '2026-10-24'].map((date, index) =>
      transaction(`cafe-${index}`, date, 'Demo Cafe', 75, 'DEBIT')),
    transaction('single', '2026-10-15', 'Demo Books', 300, 'DEBIT'),
    transaction('pending', '2026-11-03', 'Demo Gym', 499, 'DEBIT', 'PENDING'),
  ]),
};

export const reconciliationFixture = {
  accountId,
  currency: 'ZAR',
  asOf: '2026-11-04',
  balance: balanceEnvelope(15000),
  invoices: [
    { id: 'inv-1', reference: 'DESIGN-101', amount: 5000, currency: 'ZAR', dueDate: '2026-10-30' },
    { id: 'inv-2', reference: 'WEB-102', amount: 3000, currency: 'ZAR', dueDate: '2026-11-02' },
    { id: 'inv-3', reference: 'COPY-103', amount: 1500, currency: 'ZAR', dueDate: '2026-11-01' },
    { id: 'inv-4', reference: 'SHARED', amount: 1000, currency: 'ZAR', dueDate: '2026-11-10' },
    { id: 'inv-5', reference: 'SHARED', amount: 1000, currency: 'ZAR', dueDate: '2026-11-10' },
  ],
  transactions: transactionEnvelope([
    transaction('pay-1', '2026-10-29', 'design-101', 5000, 'CREDIT'),
    transaction('pay-2', '2026-11-01', 'WEB-102', 1000, 'CREDIT'),
    transaction('pay-3', '2026-11-02', 'UNKNOWN', 250, 'CREDIT'),
    transaction('pay-4', '2026-11-03', 'SHARED', 1000, 'CREDIT'),
  ]),
};
