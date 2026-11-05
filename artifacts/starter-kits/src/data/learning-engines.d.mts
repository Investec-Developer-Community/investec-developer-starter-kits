export interface Event { id: string; currency: string; date: string; amountMinor: number; kind: 'income' | 'bill' }
export interface ForecastInput { currency: string; startDate: string; startingMinor: number; dailySpendMinor: number; purchaseMinor: number; purchaseDate: string; events: Event[] }
export interface ForecastDay { date: string; openingMinor: number; incomeMinor: number; billsMinor: number; dailySpendMinor: number; purchaseMinor: number; closingMinor: number }
export function forecast(input: ForecastInput): { currency: string; days: ForecastDay[]; lowestMinor: number; lowestDate: string; firstShortfall: string | null };
export interface Transaction { id: string; currency: string; date: string; amountMinor: number; merchant: string; status: 'POSTED' | 'PENDING'; type: 'CREDIT' | 'DEBIT' }
export interface RecurringInput { currency: string; asOf: string; transactions: Transaction[] }
export function detectRecurring(input: RecurringInput): { currency: string; ignored: number; results: { merchant: string; observations: number; typicalMinor: number; likely: boolean; estimatedNextDate: string | null; reason: string }[] };
export interface Invoice { id: string; reference: string; currency: string; dueDate: string; amountMinor: number }
export interface Payment { id: string; reference: string; currency: string; date: string; amountMinor: number; status: 'POSTED' | 'PENDING'; type: 'CREDIT' | 'DEBIT' }
export interface ReconcileInput { currency: string; asOf: string; invoices: Invoice[]; payments: Payment[] }
export function reconcile(input: ReconcileInput): { currency: string; invoices: (Invoice & { paidMinor: number; outstandingMinor: number; status: 'paid' | 'partial' | 'unpaid'; overdue: boolean })[]; payments: (Omit<Payment, 'status'> & { status: 'matched' | 'unmatched' | 'ambiguous'; reason: string; invoiceId: string | null })[] };
