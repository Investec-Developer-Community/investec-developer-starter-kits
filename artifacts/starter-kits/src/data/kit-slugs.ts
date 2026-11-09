// Every catalogue kit slug. Kit.slug is typed from this list, so the demo registry must cover each one.
export const kitSlugs = [
  'interest-maximiser',
  'spend-explorer',
  'card-guard',
  'payment-pinger',
  'card-to-sheet-sync',
  'swipe-n-save',
  'cashflow-runway',
  'recurring-payment-detective',
  'who-paid',
] as const;

export type KitSlug = (typeof kitSlugs)[number];
