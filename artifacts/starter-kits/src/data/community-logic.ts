// Logic for the community mock kits, written once as plain JavaScript source.
// The same source string is (a) evaluated for the in-browser demos and
// (b) embedded verbatim in the downloadable scripts, so both behave identically.
// Keep these sources free of backticks and template interpolation.

export const pingerLogic = String.raw`
function validatePingerTxn(t) {
  const errors = [];
  if (!t || typeof t !== 'object') return ['transaction must be an object'];
  if (typeof t.merchant !== 'string' || t.merchant.trim() === '') errors.push('merchant is required');
  else if (t.merchant.length > 80) errors.push('merchant must be 80 characters or fewer');
  if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) errors.push('amount must be a number');
  else if (t.amount <= 0) errors.push('amount must be greater than 0');
  if (typeof t.currency !== 'string' || !/^[A-Z]{3}$/.test(t.currency)) errors.push('currency must be a 3-letter uppercase code like ZAR');
  if (t.city !== undefined && typeof t.city !== 'string') errors.push('city must be text');
  if (t.cardLast4 !== undefined && t.cardLast4 !== '' && !/^\d{4}$/.test(String(t.cardLast4))) errors.push('cardLast4 must be exactly 4 digits');
  return errors;
}

function previewPing(t) {
  const errors = validatePingerTxn(t);
  if (errors.length) return { ok: false, errors: errors, message: null, alert: null, foreign: false };
  const amt = t.currency + ' ' + t.amount.toFixed(2);
  const city = typeof t.city === 'string' ? t.city.trim() : '';
  const where = t.merchant.trim() + (city ? ' (' + city + ')' : '');
  const card = t.cardLast4 ? ' - card ending ' + t.cardLast4 : '';
  const message = 'Card payment: ' + amt + ' at ' + where + card;
  const foreign = t.currency !== 'ZAR';
  const alert = foreign ? 'Non-ZAR alert: ' + amt + ' at ' + where + '. Check that this was you.' : null;
  return { ok: true, errors: [], message: message, alert: alert, foreign: foreign };
}
`;

export const sheetLogic = String.raw`
function validateSheetTxn(t) {
  const errors = [];
  if (!t || typeof t !== 'object') return ['transaction must be an object'];
  if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || Number.isNaN(Date.parse(t.date + 'T00:00:00Z')) || new Date(t.date + 'T00:00:00Z').toISOString().slice(0, 10) !== t.date) errors.push('date must be YYYY-MM-DD');
  if (typeof t.merchant !== 'string' || t.merchant.trim() === '') errors.push('merchant is required');
  if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) errors.push('amount must be a number');
  else if (t.amount <= 0) errors.push('amount must be greater than 0');
  if (typeof t.currency !== 'string' || !/^[A-Z]{3}$/.test(t.currency)) errors.push('currency must be a 3-letter uppercase code');
  if (t.status !== 'approved' && t.status !== 'declined') errors.push('status must be approved or declined');
  if (t.category !== undefined && typeof t.category !== 'string') errors.push('category must be text');
  return errors;
}

function buildSheetRows(txns) {
  if (!Array.isArray(txns)) throw new Error('transactions must be an array');
  const rows = [];
  const skipped = [];
  txns.forEach(function (t, i) {
    const errors = validateSheetTxn(t);
    if (errors.length) { skipped.push({ index: i, reason: errors.join('; ') }); return; }
    if (t.status !== 'approved') { skipped.push({ index: i, reason: 'status is ' + t.status + '; only approved rows are written' }); return; }
    rows.push({ date: t.date, merchant: t.merchant.trim(), category: t.category || '', amount: t.amount, currency: t.currency });
  });
  return { rows: rows, skipped: skipped };
}

function csvCell(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(2) : '';
  let s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas (CSV injection): =, +, -, @, |, % and leading tab/CR.
  if (/^\s*[=+\-@|%]/.test(s) || /^[\t\r]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(rows) {
  const header = ['Date', 'Merchant', 'Category', 'Amount', 'Currency'];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach(function (r) { lines.push([r.date, r.merchant, r.category, r.amount, r.currency].map(csvCell).join(',')); });
  return lines.join('\r\n') + '\r\n';
}
`;

export const swipeLogic = String.raw`
function validatePercent(p) {
  if (typeof p !== 'number' || !Number.isFinite(p)) return 'percent must be a number';
  if (p < 1 || p > 10000) return 'percent must be between 1 and 10000';
  return null;
}

function swipeSaving(t, pct) {
  const errors = [];
  if (!t || typeof t !== 'object') return { ok: false, errors: ['transaction must be an object'], saving: 0, excluded: false, reason: '' };
  if (typeof t.merchant !== 'string' || t.merchant.trim() === '') errors.push('merchant is required');
  if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) errors.push('amount must be a number');
  else if (t.amount <= 0) errors.push('amount must be greater than 0');
  if (typeof t.mcc !== 'string' || !/^\d{4}$/.test(t.mcc)) errors.push('mcc must be a 4-digit merchant category code');
  if (errors.length) return { ok: false, errors: errors, saving: 0, excluded: false, reason: errors.join('; ') };
  if (t.mcc === '6011') return { ok: true, errors: [], saving: 0, excluded: true, reason: 'ATM withdrawal (MCC 6011) excluded' };
  const saving = Math.round(t.amount * pct) / 100;
  return { ok: true, errors: [], saving: saving, excluded: false, reason: pct + '% of ' + t.amount.toFixed(2) };
}

function simulateSwipe(txns, pct) {
  const pe = validatePercent(pct);
  if (pe) return { ok: false, error: pe, results: [], total: 0 };
  if (!Array.isArray(txns)) return { ok: false, error: 'transactions must be an array', results: [], total: 0 };
  const results = txns.map(function (t) { return { txn: t, result: swipeSaving(t, pct) }; });
  const cents = results.reduce(function (a, r) { return a + Math.round(r.result.saving * 100); }, 0);
  return { ok: true, error: null, results: results, total: cents / 100 };
}
`;

export interface PingTxn { merchant: unknown; amount: unknown; currency: unknown; city?: unknown; cardLast4?: unknown }
export interface PingPreview { ok: boolean; errors: string[]; message: string | null; alert: string | null; foreign: boolean }
export interface SheetRow { date: string; merchant: string; category: string; amount: number; currency: string }
export interface SwipeResult { ok: boolean; errors: string[]; saving: number; excluded: boolean; reason: string }
export interface SwipeSim { ok: boolean; error: string | null; results: { txn: Record<string, unknown>; result: SwipeResult }[]; total: number }

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const load = <T,>(src: string, names: string[]): T => new Function(`${src}\nreturn { ${names.join(', ')} };`)() as T;

export const pinger = load<{ previewPing: (t: PingTxn) => PingPreview }>(pingerLogic, ['previewPing']);
export const sheet = load<{
  buildSheetRows: (t: unknown[]) => { rows: SheetRow[]; skipped: { index: number; reason: string }[] };
  csvCell: (v: unknown) => string;
  rowsToCsv: (rows: SheetRow[]) => string;
}>(sheetLogic, ['buildSheetRows', 'csvCell', 'rowsToCsv']);
export const swipe = load<{
  validatePercent: (p: number) => string | null;
  simulateSwipe: (t: unknown[], p: number) => SwipeSim;
}>(swipeLogic, ['validatePercent', 'simulateSwipe']);
