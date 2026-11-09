import type { AccountTransaction } from './learning-engines.mjs';

export interface SpendRow {
  id: string;
  date: string;
  description: string;
  category: string;
  amountMinor: number;
  status: AccountTransaction['status'];
  type: AccountTransaction['type'];
}

export function categorise(description: string): string;
export function spendRows(transactions: AccountTransaction[]): SpendRow[];
export function filterSpendRows<T extends Pick<SpendRow, 'category' | 'description'>>(rows: T[], filters?: { category?: string; search?: string }): T[];
export function postedDebitTotalsMinor(rows: Pick<SpendRow, 'category' | 'amountMinor' | 'status' | 'type'>[]): [string, number][];
