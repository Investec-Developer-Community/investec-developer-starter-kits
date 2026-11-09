import type { AccountTransaction, BalanceResponse, TransactionResponse } from './learning-engines.mjs';

export interface SampleAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  referenceName: string;
  productName: string;
}

export interface SampleData {
  listAccounts(): Promise<{ data: { accounts: SampleAccount[] }; links: { self: string }; meta: { totalPages: number } }>;
  getBalance(accountId: string): Promise<BalanceResponse>;
  getTransactions(accountId: string, filters?: {
    fromDate?: string;
    toDate?: string;
    transactionType?: string;
    includePending?: boolean;
  }): Promise<TransactionResponse>;
  getPendingTransactions(accountId: string): Promise<TransactionResponse>;
}

export function decimalToMinor(value: number | string): number;
export function transactionAmountMinor(transaction: Pick<AccountTransaction, 'type' | 'amount'>): number;
export function normalizeTransaction(transaction: AccountTransaction, currency: string, index?: number): AccountTransaction & {
  id: string;
  date: string;
  currency: string;
  amountMinor: number;
};
export function createSampleData(fixtures?: Record<string, unknown>): SampleData;
