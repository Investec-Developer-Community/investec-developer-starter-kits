export interface Event {
  id: string;
  currency: string;
  date: string;
  amount: number;
  kind: 'income' | 'bill';
}

export interface BalanceResponse {
  data: {
    accountId?: string;
    currentBalance: number;
    availableBalance?: number;
    budgetBalance?: number;
    straightBalance?: number;
    cashBalance?: number;
    currency: string;
  };
  links: { self: string };
  meta: { totalPages: number };
}

export interface AccountTransaction {
  accountId?: string;
  uuid?: string;
  type: 'CREDIT' | 'DEBIT';
  status: 'POSTED' | 'PENDING';
  description: string;
  postedOrder?: number;
  postingDate?: string;
  valueDate?: string;
  transactionDate?: string;
  amount: number;
  transactionType?: string;
}

export interface TransactionResponse {
  data: { transactions: AccountTransaction[] };
  links: { self: string };
  meta: { totalPages: number };
}

interface AccountInput {
  accountId: string;
  currency: string;
  balance: BalanceResponse;
  transactions: TransactionResponse;
}

export interface ForecastInput extends AccountInput {
  startDate: string;
  dailySpend: number;
  purchase: { amount: number; date: string };
  events: Event[];
}

export interface ForecastDay {
  date: string;
  openingMinor: number;
  incomeMinor: number;
  billsMinor: number;
  dailySpendMinor: number;
  purchaseMinor: number;
  closingMinor: number;
}

export function forecast(input: ForecastInput): {
  currency: string;
  days: ForecastDay[];
  lowestMinor: number;
  lowestDate: string;
  firstShortfall: string | null;
};

export interface RecurringInput extends AccountInput {
  asOf: string;
}

export function detectRecurring(input: RecurringInput): {
  currency: string;
  ignored: number;
  results: {
    merchant: string;
    observations: number;
    typicalMinor: number;
    likely: boolean;
    estimatedNextDate: string | null;
    reason: string;
  }[];
};

export interface Invoice {
  id: string;
  reference: string;
  currency: string;
  dueDate: string;
  amount: number;
}

export interface ReconcileInput extends AccountInput {
  asOf: string;
  invoices: Invoice[];
}

export function reconcile(input: ReconcileInput): {
  currency: string;
  invoices: (Invoice & {
    amountMinor: number;
    paidMinor: number;
    outstandingMinor: number;
    status: 'paid' | 'partial' | 'unpaid';
    overdue: boolean;
  })[];
  payments: (Omit<AccountTransaction, 'status'> & {
    id: string;
    date: string;
    currency: string;
    amountMinor: number;
    status: 'matched' | 'unmatched' | 'ambiguous';
    reason: string;
    invoiceId: string | null;
  })[];
};
