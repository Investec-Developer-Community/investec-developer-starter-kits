// Payment Pinger domain logic shared by the Launchpad browser demo and the downloaded
// starter script (embedded via scripts/generate-engine-sources.mjs). Pure: no I/O, no imports.
export function validatePingerTxn(t) {
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

export function previewPing(t) {
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
