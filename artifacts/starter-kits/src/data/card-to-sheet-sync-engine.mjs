// Card-To-Sheet-Sync domain logic shared by the Launchpad browser demo and the downloaded
// starter script (embedded via scripts/generate-engine-sources.mjs). Pure: no I/O, no imports.
export function validateSheetTxn(t) {
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

export function buildSheetRows(txns) {
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

export function csvCell(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(2) : '';
  let s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas (CSV injection): =, +, -, @, |, % and leading tab/CR.
  if (/^\s*[=+\-@|%]/.test(s) || /^[\t\r]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function rowsToCsv(rows) {
  const header = ['Date', 'Merchant', 'Category', 'Amount', 'Currency'];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach(function (r) { lines.push([r.date, r.merchant, r.category, r.amount, r.currency].map(csvCell).join(',')); });
  return lines.join('\r\n') + '\r\n';
}
