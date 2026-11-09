export interface SheetRow { date: string; merchant: string; category: string; amount: number; currency: string }
export interface SheetSkip { index: number; reason: string }

export function validateSheetTxn(t: unknown): string[];
export function buildSheetRows(txns: unknown[]): { rows: SheetRow[]; skipped: SheetSkip[] };
export function csvCell(v: unknown): string;
export function rowsToCsv(rows: SheetRow[]): string;
