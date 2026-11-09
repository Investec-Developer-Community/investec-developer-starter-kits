export interface TransferPreviewInput {
  balanceMinor: number;
  pendingMinor: number;
  reserveMinor: number;
  targetBalanceMinor?: number;
}

export interface TransferPreview {
  transferableMinor: number;
  sourceAfterMinor: number;
  targetAfterMinor: number;
}

export function pendingDebitsMinor(transactions: readonly { status: string; type: string; amount: number | string }[]): number;
export function transferPreviewMinor(input: TransferPreviewInput): TransferPreview;
