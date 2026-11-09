export interface CardGuardPurchase {
  amount: number;
  merchantCategory: string;
  merchant?: string;
}

export interface CardGuardRules {
  spendLimit: number;
  blockedCategories: string[];
}

export interface CardGuardDecision {
  approved: boolean;
  reason: string;
}

export function formatRand(amount: number): string;
export function decide(purchase: CardGuardPurchase, rules: CardGuardRules): CardGuardDecision;
