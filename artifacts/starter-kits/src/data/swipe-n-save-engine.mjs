// Swipe n Save domain logic shared by the Launchpad browser demo and the downloaded
// starter script (embedded via scripts/generate-engine-sources.mjs). Pure: no I/O, no imports.
export function validatePercent(p) {
  if (typeof p !== 'number' || !Number.isFinite(p)) return 'percent must be a number';
  if (p < 1 || p > 10000) return 'percent must be between 1 and 10000';
  return null;
}

export function swipeSaving(t, pct) {
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

export function simulateSwipe(txns, pct) {
  const pe = validatePercent(pct);
  if (pe) return { ok: false, error: pe, results: [], total: 0 };
  if (!Array.isArray(txns)) return { ok: false, error: 'transactions must be an array', results: [], total: 0 };
  const results = txns.map(function (t) { return { txn: t, result: swipeSaving(t, pct) }; });
  const cents = results.reduce(function (a, r) { return a + Math.round(r.result.saving * 100); }, 0);
  return { ok: true, error: null, results: results, total: cents / 100 };
}
