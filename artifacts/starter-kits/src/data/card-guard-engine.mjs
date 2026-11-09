// Card Guard rules engine (Launchpad illustrative example kit). Fictional data only; no card or bank connection.
// Amounts use the en-ZA convention: "R 1 500,00", grouped with a no-break space (U+00A0) and a decimal comma.
// The formatter is explicit so output does not depend on the host's locale data.
const GROUP_SEPARATOR = '\u00a0';

export function formatRand(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'R ' + String(amount);
  const [whole, cents] = Math.abs(amount).toFixed(2).split('.');
  const sign = amount < 0 && Number(whole + cents) !== 0 ? '-' : '';
  return 'R ' + sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR) + ',' + cents;
}

export function decide(purchase, rules) {
  if (!Number.isFinite(purchase.amount) || purchase.amount <= 0) {
    return { approved: false, reason: 'Invalid amount' };
  }
  const blocked = rules.blockedCategories.map(category => category.toLowerCase());
  if (blocked.includes(purchase.merchantCategory.toLowerCase())) {
    return { approved: false, reason: 'Merchant category ' + purchase.merchantCategory + ' is restricted' };
  }
  if (purchase.amount > rules.spendLimit) {
    return { approved: false, reason: 'Amount exceeds limit of ' + formatRand(rules.spendLimit) };
  }
  return { approved: true, reason: 'Within limit and merchant allowed' };
}
