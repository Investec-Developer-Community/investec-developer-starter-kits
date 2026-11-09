// Interest Maximiser domain logic shared by the Launchpad browser demo and the
// downloaded interest-maximiser.mjs. All money is integer minor units (cents).
import { decimalToMinor } from './sample-helpers.mjs';

export function pendingDebitsMinor(transactions) {
  return transactions
    .filter(row => row.status === 'PENDING' && row.type === 'DEBIT')
    .reduce((sum, row) => sum + Math.abs(decimalToMinor(row.amount)), 0);
}

export function transferPreviewMinor({ balanceMinor, pendingMinor, reserveMinor, targetBalanceMinor = 0 }) {
  const transferableMinor = Math.max(0, balanceMinor - pendingMinor - reserveMinor);
  return {
    transferableMinor,
    sourceAfterMinor: balanceMinor - transferableMinor,
    targetAfterMinor: targetBalanceMinor + transferableMinor,
  };
}
