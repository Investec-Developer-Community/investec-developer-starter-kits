import type { ForecastInput, RecurringInput, ReconcileInput } from './learning-engines.mjs';

export const runwayFixture: ForecastInput = {
  currency: 'ZAR', startDate: '2026-11-01', startingMinor: 1500000, dailySpendMinor: 25000,
  purchaseMinor: 0, purchaseDate: '2026-11-10',
  events: [
    { id: 'rent', currency: 'ZAR', date: '2026-11-02', amountMinor: 700000, kind: 'bill' },
    { id: 'insurance', currency: 'ZAR', date: '2026-11-05', amountMinor: 100000, kind: 'bill' },
    { id: 'salary', currency: 'ZAR', date: '2026-11-25', amountMinor: 2000000, kind: 'income' },
  ],
};
export const recurringFixture: RecurringInput = {
  currency: 'ZAR', asOf: '2026-11-04',
  transactions: [
    ...['2026-08-31', '2026-09-30', '2026-10-31'].map((date, i) => ({ id: `gym-${i}`, date, merchant: ['Demo Gym', ' demo gym ', 'DEMO GYM'][i], amountMinor: 49900, currency: 'ZAR', status: 'POSTED' as const, type: 'DEBIT' as const })),
    ...['2026-08-12', '2026-09-13', '2026-10-12'].map((date, i) => ({ id: `stream-${i}`, date, merchant: 'Demo Streaming', amountMinor: 19900, currency: 'ZAR', status: 'POSTED' as const, type: 'DEBIT' as const })),
    ...['2026-08-02', '2026-08-19', '2026-10-24'].map((date, i) => ({ id: `cafe-${i}`, date, merchant: 'Demo Cafe', amountMinor: 7500, currency: 'ZAR', status: 'POSTED' as const, type: 'DEBIT' as const })),
    { id: 'single', date: '2026-10-15', merchant: 'Demo Books', amountMinor: 30000, currency: 'ZAR', status: 'POSTED', type: 'DEBIT' },
    { id: 'pending', date: '2026-11-03', merchant: 'Demo Gym', amountMinor: 49900, currency: 'ZAR', status: 'PENDING', type: 'DEBIT' },
  ],
};
export const reconciliationFixture: ReconcileInput = {
  currency: 'ZAR', asOf: '2026-11-04',
  invoices: [
    { id: 'inv-1', reference: 'DESIGN-101', amountMinor: 500000, currency: 'ZAR', dueDate: '2026-10-30' },
    { id: 'inv-2', reference: 'WEB-102', amountMinor: 300000, currency: 'ZAR', dueDate: '2026-11-02' },
    { id: 'inv-3', reference: 'COPY-103', amountMinor: 150000, currency: 'ZAR', dueDate: '2026-11-01' },
    { id: 'inv-4', reference: 'SHARED', amountMinor: 100000, currency: 'ZAR', dueDate: '2026-11-10' },
    { id: 'inv-5', reference: 'SHARED', amountMinor: 100000, currency: 'ZAR', dueDate: '2026-11-10' },
  ],
  payments: [
    { id: 'pay-1', reference: 'design-101', amountMinor: 500000, currency: 'ZAR', date: '2026-10-29', status: 'POSTED', type: 'CREDIT' },
    { id: 'pay-2', reference: 'WEB-102', amountMinor: 100000, currency: 'ZAR', date: '2026-11-01', status: 'POSTED', type: 'CREDIT' },
    { id: 'pay-3', reference: 'UNKNOWN', amountMinor: 25000, currency: 'ZAR', date: '2026-11-02', status: 'POSTED', type: 'CREDIT' },
    { id: 'pay-4', reference: 'SHARED', amountMinor: 100000, currency: 'ZAR', date: '2026-11-03', status: 'POSTED', type: 'CREDIT' },
  ],
};
